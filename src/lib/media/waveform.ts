import "server-only";

import { promises as fs } from "node:fs";

import { streamMonoPcm } from "./audio";
import type { WaveformData } from "./types";

/**
 * Generate a compact peaks file from any media source ffmpeg can decode.
 *
 * Strategy:
 *   1. Stream mono int16 PCM out of ffmpeg at a low sample rate.
 *   2. Bucket samples into fixed-size windows (1 / peaksPerSecond seconds).
 *   3. For each bucket, record the min and max amplitude.
 *   4. Normalise to -1..1 floats and write a JSON peaks file.
 *
 * The default profile (8 kHz mono, 50 peaks/s) produces ~360k samples
 * per hour and a peaks file of ~250 KB, which is small enough for the
 * editor to fetch eagerly without becoming a network drag.
 */

export interface WaveformOptions {
  /** Mono PCM sample rate fed to ffmpeg. Higher = more analysis fidelity. */
  pcmSampleRate?: number;
  /** Output peaks resolution. Higher = bigger file, sharper waveform. */
  peaksPerSecond?: number;
  /** Source duration (seconds), used for progress calc + final metadata. */
  durationSec: number;
  /** 0..1 progress hook. */
  onProgress?: (fraction: number) => void;
}

export const DEFAULT_WAVEFORM_OPTIONS = {
  pcmSampleRate: 8_000,
  peaksPerSecond: 50,
};

export interface WaveformGenerationResult {
  data: WaveformData;
  /** Where the peaks JSON was written. */
  path: string;
}

/**
 * Generate peaks for `inputPath` and write them to `outputJsonPath`.
 * Returns the in-memory `WaveformData` so callers don't need to re-read
 * the file just to commit summary metadata to project state.
 */
export async function generateWaveform(
  inputPath: string,
  outputJsonPath: string,
  itemId: string,
  opts: WaveformOptions,
): Promise<WaveformGenerationResult> {
  const pcmSampleRate = opts.pcmSampleRate ?? DEFAULT_WAVEFORM_OPTIONS.pcmSampleRate;
  const peaksPerSecond =
    opts.peaksPerSecond ?? DEFAULT_WAVEFORM_OPTIONS.peaksPerSecond;
  const samplesPerBucket = Math.max(
    1,
    Math.round(pcmSampleRate / peaksPerSecond),
  );

  // Two interleaved entries (min, max) per bucket. Pre-allocate an
  // upper-bound array sized from duration; trim at the end.
  const expectedBuckets = Math.max(
    1,
    Math.ceil(opts.durationSec * peaksPerSecond),
  );
  const peaks = new Float32Array(expectedBuckets * 2);
  let bucketIndex = 0;
  let bucketSampleCount = 0;
  let bucketMin = Number.POSITIVE_INFINITY;
  let bucketMax = Number.NEGATIVE_INFINITY;

  const flushBucket = () => {
    if (bucketSampleCount === 0) return;
    if (bucketIndex * 2 + 1 >= peaks.length) {
      // Source longer than expected — drop tail rather than reallocate.
      bucketSampleCount = 0;
      bucketMin = Number.POSITIVE_INFINITY;
      bucketMax = Number.NEGATIVE_INFINITY;
      return;
    }
    peaks[bucketIndex * 2] = bucketMin / 32_768;
    peaks[bucketIndex * 2 + 1] = bucketMax / 32_768;
    bucketIndex += 1;
    bucketSampleCount = 0;
    bucketMin = Number.POSITIVE_INFINITY;
    bucketMax = Number.NEGATIVE_INFINITY;
  };

  await streamMonoPcm(inputPath, {
    sampleRate: pcmSampleRate,
    channels: 1,
    durationSec: opts.durationSec,
    onProgress: opts.onProgress,
    onChunk: (chunk) => {
      // chunk is int16 LE; iterate as Int16Array for speed.
      const view = new Int16Array(
        chunk.buffer,
        chunk.byteOffset,
        chunk.byteLength >> 1,
      );
      for (let i = 0; i < view.length; i++) {
        const sample = view[i];
        if (sample < bucketMin) bucketMin = sample;
        if (sample > bucketMax) bucketMax = sample;
        bucketSampleCount += 1;
        if (bucketSampleCount >= samplesPerBucket) flushBucket();
      }
    },
  });
  flushBucket();

  const filledLength = bucketIndex * 2;
  // Convert filled portion into a plain number array for JSON. Round to
  // 4 decimal places — that's still well below the rendering noise floor.
  const out: number[] = new Array(filledLength);
  for (let i = 0; i < filledLength; i++) {
    out[i] = Math.round(peaks[i] * 10000) / 10000;
  }

  const data: WaveformData = {
    version: 1,
    itemId,
    channels: 1,
    sampleRate: pcmSampleRate,
    durationSec: opts.durationSec,
    peaksPerSecond,
    peakCount: bucketIndex,
    peaks: out,
  };
  await fs.writeFile(outputJsonPath, JSON.stringify(data), "utf8");
  return { data, path: outputJsonPath };
}

/**
 * Read a peaks file back into memory. Returns null if the file is
 * missing or unreadable — callers must handle the absence case.
 */
export async function readWaveform(
  path: string,
): Promise<WaveformData | null> {
  try {
    const raw = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(raw) as WaveformData;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.peaks)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
