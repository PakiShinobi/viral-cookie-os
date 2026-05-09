import "server-only";

import { spawn } from "node:child_process";
import ffprobeStaticImport from "ffprobe-static";

import type {
  ProbeResult,
  ProbeResultAudio,
  ProbeResultVideo,
  ProbeSummary,
  RawProbe,
} from "./types";

/**
 * ffprobe-static ships an object `{ path }` (in CommonJS interop) where
 * `path` is the absolute binary path. Some setups expose the bare
 * string. Cope with both shapes defensively.
 */
const FFPROBE_PATH = resolveBinaryPath(ffprobeStaticImport);

function resolveBinaryPath(mod: unknown): string {
  if (typeof mod === "string") return mod;
  if (mod && typeof mod === "object" && "path" in mod) {
    const p = (mod as { path?: unknown }).path;
    if (typeof p === "string") return p;
  }
  throw new Error("ffprobe-static did not expose a binary path");
}

/**
 * Run ffprobe in JSON mode against `filePath` and return the parsed
 * result. Bounded with a 30s timeout to avoid hanging on weird inputs.
 */
export async function probeFile(filePath: string): Promise<ProbeResult> {
  const raw = await runFfprobe(filePath);
  return normaliseProbe(raw);
}

export function summariseProbe(probe: ProbeResult): ProbeSummary {
  const v = probe.video;
  const a = probe.audio[0];
  return {
    durationSec: probe.format.durationSec,
    bitRate: probe.format.bitRate,
    videoCodec: v?.codec ?? null,
    width: v?.width ?? null,
    height: v?.height ?? null,
    fps: v ? round1(v.fps) : null,
    audioCodec: a?.codec ?? null,
    audioChannels: a?.channels ?? null,
    audioSampleRate: a?.sampleRate ?? null,
    audioStreamCount: probe.audio.length,
  };
}

function round1(n: number): number {
  return Math.round(n * 100) / 100;
}

async function runFfprobe(filePath: string): Promise<RawProbe> {
  const args = [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ];

  return new Promise<RawProbe>((resolve, reject) => {
    const proc = spawn(FFPROBE_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("ffprobe timed out"));
    }, 30_000);

    proc.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    proc.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`ffprobe exited ${code}: ${err.trim() || "no stderr"}`));
        return;
      }
      try {
        resolve(JSON.parse(out) as RawProbe);
      } catch (e) {
        reject(new Error(`ffprobe returned non-JSON output: ${(e as Error).message}`));
      }
    });
  });
}

function normaliseProbe(raw: RawProbe): ProbeResult {
  const fmt = raw.format ?? {};
  const streams = raw.streams ?? [];

  const videoStream = streams.find((s) => s.codec_type === "video");
  const audioStreams = streams.filter((s) => s.codec_type === "audio");

  const video: ProbeResultVideo | null = videoStream
    ? {
        codec: videoStream.codec_name ?? "unknown",
        width: videoStream.width ?? 0,
        height: videoStream.height ?? 0,
        fps: parseFrameRate(videoStream.avg_frame_rate ?? videoStream.r_frame_rate),
        pixFmt: videoStream.pix_fmt ?? "unknown",
        bitRate: parseIntOrNull(videoStream.bit_rate),
      }
    : null;

  const audio: ProbeResultAudio[] = audioStreams.map((s) => ({
    codec: s.codec_name ?? "unknown",
    channels: s.channels ?? 0,
    sampleRate: parseIntOrNull(s.sample_rate) ?? 0,
    channelLayout: s.channel_layout ?? "unknown",
    bitRate: parseIntOrNull(s.bit_rate),
  }));

  return {
    raw,
    format: {
      name: fmt.format_name ?? "unknown",
      durationSec: parseFloatOrNull(fmt.duration),
      sizeBytes: parseIntOrNull(fmt.size) ?? 0,
      bitRate: parseIntOrNull(fmt.bit_rate),
    },
    video,
    audio,
  };
}

function parseFrameRate(input: string | undefined): number {
  if (!input || typeof input !== "string") return 0;
  if (input.includes("/")) {
    const [num, den] = input.split("/").map((p) => Number(p));
    if (den && Number.isFinite(num) && Number.isFinite(den)) return num / den;
    return 0;
  }
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseIntOrNull(input: string | undefined): number | null {
  if (input === undefined || input === null || input === "") return null;
  const n = Number(input);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseFloatOrNull(input: string | undefined): number | null {
  if (input === undefined || input === null || input === "") return null;
  const n = Number(input);
  return Number.isFinite(n) ? n : null;
}
