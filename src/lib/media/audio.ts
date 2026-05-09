import "server-only";

import { spawn } from "node:child_process";
import ffmpegStaticImport from "ffmpeg-static";

import type { ExtractedAudioInfo } from "./types";

const FFMPEG_PATH = resolveFfmpegPath(ffmpegStaticImport);

function resolveFfmpegPath(mod: unknown): string {
  if (typeof mod === "string") return mod;
  if (mod && typeof mod === "object" && "default" in mod) {
    const def = (mod as { default?: unknown }).default;
    if (typeof def === "string") return def;
  }
  throw new Error("ffmpeg-static did not expose a binary path");
}

/**
 * Default extraction profile.
 *
 * 48 kHz / 16-bit PCM is what most NLEs use as the "lossless working
 * format" — large enough to feel native (≈ 192 KB/s per channel) but
 * still cheap to scrub and analyse. We downmix to stereo (or pass mono
 * through unchanged) so the output is consistent for the rest of the
 * pipeline.
 */
export const DEFAULT_AUDIO_PROFILE = {
  sampleRate: 48_000,
  channels: 2,
  /** PCM signed 16-bit little-endian. */
  codec: "pcm_s16le" as const,
  format: "wav" as const,
};

export interface ExtractAudioOptions {
  sampleRate?: number;
  channels?: number;
  /** Progress callback fed by ffmpeg's `out_time_ms`. 0..1 inclusive. */
  onProgress?: (fraction: number) => void;
  /** Total source duration in seconds, used for progress calculation. */
  durationSec?: number | null;
}

/**
 * Extract the audio track of a media file into a PCM WAV.
 *
 * Returns the resolved WAV path and the canonical sample-rate / channel
 * metadata. If the source has no audio stream, ffmpeg fails — callers
 * should treat that as "audio-only outputs not applicable".
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  options: ExtractAudioOptions = {},
): Promise<ExtractedAudioInfo> {
  const sampleRate = options.sampleRate ?? DEFAULT_AUDIO_PROFILE.sampleRate;
  const channels = options.channels ?? DEFAULT_AUDIO_PROFILE.channels;
  const args = [
    "-hide_banner",
    "-nostdin",
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-map_metadata",
    "-1",
    "-ac",
    String(channels),
    "-ar",
    String(sampleRate),
    "-acodec",
    "pcm_s16le",
    "-progress",
    "pipe:2",
    outputPath,
  ];

  await runFfmpeg(args, {
    durationSec: options.durationSec ?? null,
    onProgress: options.onProgress,
  });

  const stat = await import("node:fs/promises").then((m) => m.stat(outputPath));
  return {
    path: outputPath,
    format: "pcm_s16le",
    sampleRate,
    channels,
    durationSec: options.durationSec ?? null,
    sizeBytes: stat.size,
  };
}

/**
 * Stream raw mono PCM to a callback. Used by waveform generation to
 * avoid materialising a multi-GB intermediate file when the source is
 * already conveniently shaped.
 */
export interface StreamPcmOptions {
  sampleRate: number;
  /** Forced to 1 (mono) — peaks generation collapses channels anyway. */
  channels: 1;
  /** Per-chunk callback. Chunks are aligned to even byte boundaries. */
  onChunk: (chunk: Buffer) => void;
  durationSec?: number | null;
  onProgress?: (fraction: number) => void;
}

export async function streamMonoPcm(
  inputPath: string,
  opts: StreamPcmOptions,
): Promise<void> {
  const args = [
    "-hide_banner",
    "-nostdin",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    String(opts.sampleRate),
    "-f",
    "s16le",
    "-acodec",
    "pcm_s16le",
    "-progress",
    "pipe:2",
    "pipe:1",
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let leftover: Buffer | null = null;

    proc.stdout.on("data", (chunk: Buffer) => {
      // Ensure chunks land on int16 boundaries (2 bytes).
      let buf = chunk;
      if (leftover) {
        buf = Buffer.concat([leftover, buf]);
        leftover = null;
      }
      if (buf.length % 2 === 1) {
        leftover = buf.subarray(buf.length - 1);
        buf = buf.subarray(0, buf.length - 1);
      }
      if (buf.length > 0) opts.onChunk(buf);
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      if (opts.onProgress && opts.durationSec) {
        const m = /out_time_ms=(\d+)/.exec(text);
        if (m) {
          const t = Number(m[1]) / 1_000_000;
          opts.onProgress(Math.min(1, t / opts.durationSec));
        }
      }
    });

    proc.on("error", (e) => reject(e));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `ffmpeg streamMonoPcm exited ${code}: ${tail(stderr) || "no stderr"}`,
          ),
        );
    });
  });
}

function runFfmpeg(
  args: string[],
  opts: {
    durationSec: number | null;
    onProgress?: (fraction: number) => void;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    const timeout = setTimeout(
      () => {
        proc.kill("SIGKILL");
        reject(new Error("ffmpeg timed out"));
      },
      // Generous: a 1h podcast extraction normally finishes in <60s on
      // a modern Mac, but transcoding lossy → PCM can spike on slow disks.
      30 * 60_000,
    );

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      if (opts.onProgress && opts.durationSec) {
        const m = /out_time_ms=(\d+)/.exec(text);
        if (m) {
          const t = Number(m[1]) / 1_000_000;
          opts.onProgress(Math.min(1, t / opts.durationSec));
        }
      }
    });
    proc.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else
        reject(
          new Error(`ffmpeg exited ${code}: ${tail(stderr) || "no stderr"}`),
        );
    });
  });
}

function tail(s: string, max = 400): string {
  const trimmed = s.trim();
  return trimmed.length <= max ? trimmed : `…${trimmed.slice(-max)}`;
}
