import "server-only";

import type { SyncEstimate, WaveformData } from "./types";

/**
 * Estimate the time offset between two audio sources.
 *
 * Approach:
 *   - Reduce each peaks array to a 1-D envelope: `abs(min) + abs(max)`
 *     for every bucket. This collapses signed peaks into a positive
 *     "energy" curve that's stable under polarity inversion.
 *   - Resample whichever envelope has the higher peaks-per-second to
 *     match the lower so we can compare them directly.
 *   - Slide the candidate envelope against the reference within the
 *     configured search window and compute a normalised cross-correlation
 *     at each lag.
 *   - Pick the lag with the highest correlation. Confidence is the ratio
 *     of the peak to the mean magnitude in the searched window.
 *
 * This is intentionally a coarse estimator — it locates alignment to
 * within ~20 ms (one bucket at 50 peaks/s), which is the right
 * resolution for multi-cam podcast sync. A future phase can layer a
 * sample-accurate refiner on top.
 */

export interface SyncOptions {
  /** Half-window of lags to consider, in seconds. Default 90s. */
  searchWindowSec?: number;
  /** Min confidence for an "ok" verdict. Default 0.4. */
  okThreshold?: number;
}

export const DEFAULT_SYNC_OPTIONS: Required<SyncOptions> = {
  searchWindowSec: 90,
  okThreshold: 0.4,
};

export function estimateOffset(
  reference: WaveformData,
  candidate: WaveformData,
  options: SyncOptions = {},
): SyncEstimate {
  const opts = { ...DEFAULT_SYNC_OPTIONS, ...options };

  // Resample to the lower peaks-per-second so both sides agree on a
  // common time grid. Going DOWN is cheap and avoids interpolation noise.
  const pps = Math.min(reference.peaksPerSecond, candidate.peaksPerSecond);
  const refEnv = toEnvelope(reference, pps);
  const candEnv = toEnvelope(candidate, pps);

  const maxLag = Math.max(1, Math.round(opts.searchWindowSec * pps));
  const result = correlate(refEnv, candEnv, maxLag);

  const offsetSec = result.lag / pps;
  return {
    offsetSec,
    confidence: clamp01(result.confidence),
    method: "peak_xcorr",
    searchWindowSec: opts.searchWindowSec,
    peakRatio: result.peakRatio,
  };
}

/**
 * Build a positive envelope from a peaks JSON: |min| + |max| per bucket,
 * then optionally downsample to `targetPps`.
 */
function toEnvelope(data: WaveformData, targetPps: number): Float32Array {
  const peaks = data.peaks;
  const buckets = data.peakCount;
  const env = new Float32Array(buckets);
  for (let i = 0; i < buckets; i++) {
    const min = peaks[i * 2] ?? 0;
    const max = peaks[i * 2 + 1] ?? 0;
    env[i] = Math.abs(min) + Math.abs(max);
  }

  if (data.peaksPerSecond === targetPps) return env;
  const ratio = data.peaksPerSecond / targetPps;
  const outLen = Math.max(1, Math.floor(buckets / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(buckets, Math.floor((i + 1) * ratio));
    let acc = 0;
    let count = 0;
    for (let k = start; k < end; k++) {
      acc += env[k];
      count += 1;
    }
    out[i] = count > 0 ? acc / count : 0;
  }
  return out;
}

interface CorrelationResult {
  lag: number;
  confidence: number;
  peakRatio: number;
}

/**
 * Normalised cross-correlation by lag. Positive lag means `b` starts
 * AFTER `a` (b should be pulled forward).
 *
 * The cost is O((a.length + b.length) * (2 * maxLag + 1)) which keeps
 * us in the milliseconds-to-seconds range for podcast-length material.
 */
function correlate(
  a: Float32Array,
  b: Float32Array,
  maxLag: number,
): CorrelationResult {
  const aMean = mean(a);
  const bMean = mean(b);
  const aDev = subtractMean(a, aMean);
  const bDev = subtractMean(b, bMean);
  const aNorm = norm(aDev);
  const bNorm = norm(bDev);

  if (aNorm === 0 || bNorm === 0) {
    return { lag: 0, confidence: 0, peakRatio: 0 };
  }

  const lagsCount = 2 * maxLag + 1;
  const corrs = new Float32Array(lagsCount);

  let bestIdx = 0;
  let bestVal = -Infinity;

  for (let l = -maxLag; l <= maxLag; l++) {
    let acc = 0;
    let count = 0;
    if (l >= 0) {
      const len = Math.min(aDev.length - l, bDev.length);
      for (let i = 0; i < len; i++) acc += aDev[i + l] * bDev[i];
      count = len;
    } else {
      const len = Math.min(aDev.length, bDev.length + l);
      for (let i = 0; i < len; i++) acc += aDev[i] * bDev[i - l];
      count = len;
    }
    if (count <= 0) continue;
    // Normalise by the cross-norm. This puts the result on a consistent
    // -1..1 scale across mismatched-length inputs.
    const denom = aNorm * bNorm;
    const corr = denom > 0 ? acc / denom : 0;
    const idx = l + maxLag;
    corrs[idx] = corr;
    if (corr > bestVal) {
      bestVal = corr;
      bestIdx = idx;
    }
  }

  // Confidence: peak vs RMS noise floor of the rest of the search.
  let sumSq = 0;
  let sumAbs = 0;
  for (let i = 0; i < lagsCount; i++) {
    if (i === bestIdx) continue;
    sumSq += corrs[i] * corrs[i];
    sumAbs += Math.abs(corrs[i]);
  }
  const denomCount = Math.max(1, lagsCount - 1);
  const rms = Math.sqrt(sumSq / denomCount);
  const meanAbs = sumAbs / denomCount;
  const peakRatio = meanAbs > 0 ? bestVal / meanAbs : 0;
  // Confidence blends "sharpness" (peakRatio) and absolute correlation.
  const confidence =
    rms > 0 ? Math.min(1, Math.max(0, (bestVal - rms) / (1 - rms + 1e-6))) : 0;

  return {
    lag: bestIdx - maxLag,
    confidence,
    peakRatio,
  };
}

function mean(arr: Float32Array): number {
  if (arr.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < arr.length; i++) acc += arr[i];
  return acc / arr.length;
}

function subtractMean(arr: Float32Array, m: number): Float32Array {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] - m;
  return out;
}

function norm(arr: Float32Array): number {
  let acc = 0;
  for (let i = 0; i < arr.length; i++) acc += arr[i] * arr[i];
  return Math.sqrt(acc);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function classifyEstimate(
  estimate: SyncEstimate,
  options: SyncOptions = {},
): "ok" | "low_confidence" {
  const threshold = options.okThreshold ?? DEFAULT_SYNC_OPTIONS.okThreshold;
  return estimate.confidence >= threshold ? "ok" : "low_confidence";
}
