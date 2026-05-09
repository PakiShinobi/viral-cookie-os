import "server-only";

import { spawn } from "node:child_process";
import ffmpegStaticImport from "ffmpeg-static";

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
 * Heuristic for the "interesting" thumbnail moment:
 *  - Tiny clips (<5s): seek 0.5s in.
 *  - Short clips (<60s): seek 10% in.
 *  - Long clips: seek 60s in (skip the typical intro card).
 */
function pickThumbnailTime(durationSec: number | null): number {
  if (!durationSec || durationSec <= 0) return 0.5;
  if (durationSec < 5) return Math.min(0.5, durationSec / 2);
  if (durationSec < 60) return durationSec * 0.1;
  return 60;
}

export interface ThumbnailOptions {
  /** Output max width in px. Aspect preserved. Default 1280. */
  width?: number;
  /** Override the seek time (seconds). */
  atSec?: number;
  /** Treat as audio-only — skip generation. */
  audioOnly?: boolean;
}

export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  durationSec: number | null,
  opts: ThumbnailOptions = {},
): Promise<void> {
  if (opts.audioOnly) return;
  const t = opts.atSec ?? pickThumbnailTime(durationSec);
  const width = opts.width ?? 1280;

  // -ss before -i for fast seeking; one frame; downscale via filter graph.
  const args = [
    "-ss",
    String(t),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    `scale='min(${width},iw)':-2`,
    "-q:v",
    "3",
    "-y",
    outputPath,
  ];

  await runFfmpeg(args);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("ffmpeg timed out"));
    }, 60_000);

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
        reject(new Error(`ffmpeg exited ${code}: ${tail(err)}`));
        return;
      }
      resolve();
    });
  });
}

function tail(s: string, max = 400): string {
  const trimmed = s.trim();
  return trimmed.length <= max ? trimmed : `…${trimmed.slice(-max)}`;
}
