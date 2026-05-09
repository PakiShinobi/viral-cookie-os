import "server-only";

import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";

import { extractAudio } from "./audio";
import { failJob, succeedJob, updateJob } from "./jobs";
import { enqueueJob } from "./queue";
import { estimateOffset, classifyEstimate } from "./sync";
import { generateThumbnail } from "./thumbnail";
import { probeFile, summariseProbe } from "./probe";
import {
  audioFilePath,
  audioMetaPath,
  audioUrl,
  ensureItemDir,
  findExtractedAudio,
  findPeaksFile,
  findSourceFile,
  itemDir,
  peaksFilePath,
  previewUrl,
  saveSourceStream,
  storageKey,
  thumbnailUrl,
  waveformUrl,
  writeMetaFile,
  writeProbeFile,
} from "./storage";
import { generateWaveform, readWaveform } from "./waveform";
import type {
  ExtractedAudioInfo,
  MediaImportResult,
  MediaJob,
  ProbeResult,
  ProbeSummary,
  SyncEstimate,
  SyncRecord,
  SyncStatus,
  WaveformData,
} from "./types";

/**
 * High-level orchestration for the synchronous import flow.
 *
 * 1. Persist the streamed upload to disk (atomic rename).
 * 2. Run ffprobe; cache raw output.
 * 3. If video, generate a thumbnail.
 * 4. Write a normalised meta snapshot.
 * 5. Resolve a `MediaImportResult` for the client.
 *
 * Jobs are updated throughout so a future async path (large uploads
 * with progress polling) can re-use the same pipeline by passing in
 * an existing jobId.
 */

export interface ImportOptions {
  projectId: string;
  fileName: string;
  mimeType: string;
  /** Streamed bytes. Single-pass. */
  stream: ReadableStream<Uint8Array>;
  /** Optional pre-allocated job id to thread progress through. */
  jobId?: string;
  /** Optional caller-supplied id. Defaults to a fresh UUID. */
  itemId?: string;
  /** Override kind detection. */
  kind?: "video" | "audio";
}

export async function importMediaFile(
  opts: ImportOptions,
): Promise<MediaImportResult> {
  const itemId = opts.itemId ?? randomUUID();
  const jobId = opts.jobId;

  if (jobId) {
    updateJob(jobId, {
      status: "running",
      progress: 0.05,
      message: "Saving file…",
      itemId,
    });
  }

  await ensureItemDir(opts.projectId, itemId);

  let saved: { path: string; size: number };
  try {
    saved = await saveSourceStream({
      projectId: opts.projectId,
      itemId,
      fileName: opts.fileName,
      stream: opts.stream,
    });
  } catch (e) {
    if (jobId) failJob(jobId, `save failed: ${(e as Error).message}`);
    throw e;
  }

  if (jobId) {
    updateJob(jobId, {
      progress: 0.5,
      message: "Probing media…",
    });
  }

  let probe: ProbeResult | null = null;
  try {
    probe = await probeFile(saved.path);
    await writeProbeFile(opts.projectId, itemId, probe.raw);
  } catch (e) {
    // Non-fatal: we still keep the source on disk and return what we can.
    if (jobId) {
      updateJob(jobId, {
        message: `probe failed: ${(e as Error).message}`,
      });
    }
  }

  const kind = opts.kind ?? detectKind(opts.mimeType, probe);
  const summary = probe ? summariseProbe(probe) : null;

  let thumbUrl: string | null = null;
  if (kind === "video") {
    if (jobId) {
      updateJob(jobId, {
        progress: 0.75,
        message: "Generating thumbnail…",
      });
    }
    try {
      const out = path.join(itemDir(opts.projectId, itemId), "thumb.jpg");
      await generateThumbnail(saved.path, out, summary?.durationSec ?? null);
      thumbUrl = thumbnailUrl(opts.projectId, itemId);
    } catch {
      // Non-fatal: empty thumbnail just means the card shows a placeholder.
    }
  }

  await writeMetaFile(opts.projectId, itemId, {
    itemId,
    storageKey: storageKey(opts.projectId, itemId),
    fileName: opts.fileName,
    mimeType: opts.mimeType,
    fileSize: saved.size,
    summary,
    importedAt: new Date().toISOString(),
  });

  // Enqueue background audio extraction + waveform if there's an audio
  // stream to work with. Skipped silently when probe didn't find one.
  let processingJobId: string | null = null;
  if (probe && (probe.audio.length > 0 || probe.video)) {
    const projectId = opts.projectId;
    const job = enqueueJob({
      projectId,
      itemId,
      kind: "process_media",
      message: "Queued for audio processing",
      work: async (job) => {
        return processMediaItem({
          projectId,
          itemId,
          kind,
          jobId: job.id,
          probeSummary: summary,
        });
      },
    });
    processingJobId = job.id;
  }

  const result: MediaImportResult = {
    itemId,
    storageKey: storageKey(opts.projectId, itemId),
    previewUrl: previewUrl(opts.projectId, itemId),
    thumbnailUrl: thumbUrl,
    fileName: opts.fileName,
    fileSize: saved.size,
    mimeType: opts.mimeType,
    probe: summary,
    processingJobId,
  };

  if (jobId) succeedJob(jobId, result);
  return result;
}

/* ===============================
   Post-import audio processing
================================ */

export interface ProcessMediaResult {
  itemId: string;
  audioReady: boolean;
  audioUrl: string | null;
  audio: ExtractedAudioInfo | null;
  waveformReady: boolean;
  waveformUrl: string | null;
  waveform: {
    peaksPerSecond: number;
    peakCount: number;
    durationSec: number;
  } | null;
  /** Mirrors the bin item's `processingState`. */
  state: "ready" | "failed";
  error: string | null;
}

/**
 * Run audio extraction + waveform generation for an imported source.
 *
 * Idempotent — if the WAV/peaks already exist on disk we skip the
 * heavy work and just return the metadata. Designed to be invoked
 * inside a job (`process_media`) so the route handler can return
 * immediately while the background queue chews through it.
 */
export async function processMediaItem(opts: {
  projectId: string;
  itemId: string;
  kind: "video" | "audio";
  jobId?: string;
  probeSummary?: ProbeSummary | null;
}): Promise<ProcessMediaResult> {
  const { projectId, itemId, kind, jobId } = opts;

  const source = await findSourceFile(projectId, itemId);
  if (!source) {
    const err = `source for ${projectId}/${itemId} is missing`;
    if (jobId)
      updateJob(jobId, { progress: 1, message: err, status: "failed", error: err });
    return {
      itemId,
      audioReady: false,
      audioUrl: null,
      audio: null,
      waveformReady: false,
      waveformUrl: null,
      waveform: null,
      state: "failed",
      error: err,
    };
  }

  let durationSec = opts.probeSummary?.durationSec ?? null;
  if (!durationSec) {
    try {
      const probe = await probeFile(source.path);
      durationSec = probe.format.durationSec;
    } catch {
      // Non-fatal: peak generation can run without a duration estimate,
      // it just means progress reporting is coarser.
    }
  }

  // 1. Audio extraction (or short-circuit for audio sources).
  let audioInfo: ExtractedAudioInfo | null = null;
  let audioErr: string | null = null;
  try {
    if (jobId) {
      updateJob(jobId, {
        progress: 0.05,
        message: kind === "video" ? "Extracting audio…" : "Preparing audio…",
      });
    }
    if (kind === "video") {
      audioInfo = await runExtractAudio({
        projectId,
        itemId,
        sourcePath: source.path,
        durationSec,
        jobId,
      });
    } else {
      // Audio source: no extraction needed, the source IS the audio.
      audioInfo = {
        path: source.path,
        format: "pcm_s16le",
        sampleRate: 0,
        channels: 0,
        durationSec,
        sizeBytes: source.size,
      };
    }
  } catch (e) {
    audioErr = (e as Error).message || "audio extraction failed";
  }

  // 2. Waveform generation. Skipped if we couldn't get audio.
  let waveform: WaveformData | null = null;
  let waveformErr: string | null = null;
  if (audioInfo) {
    try {
      if (jobId) {
        updateJob(jobId, {
          progress: 0.55,
          message: "Generating waveform…",
        });
      }
      const peaksPath = peaksFilePath(projectId, itemId);
      // Use the extracted WAV when available — it's a fast linear read.
      // Otherwise fall back to the original source.
      const wavInput = kind === "video" ? audioFilePath(projectId, itemId) : source.path;
      const result = await generateWaveform(wavInput, peaksPath, itemId, {
        durationSec: durationSec ?? 0,
        onProgress: (frac) => {
          if (!jobId) return;
          // Map to the back half of the overall progress bar.
          updateJob(jobId, { progress: 0.55 + frac * 0.4 });
        },
      });
      waveform = result.data;
    } catch (e) {
      waveformErr = (e as Error).message || "waveform generation failed";
    }
  }

  const state: "ready" | "failed" =
    audioInfo && waveform ? "ready" : "failed";
  const error = state === "failed" ? audioErr ?? waveformErr ?? "unknown" : null;

  return {
    itemId,
    audioReady: !!audioInfo,
    audioUrl: audioInfo ? audioUrl(projectId, itemId) : null,
    audio: audioInfo,
    waveformReady: !!waveform,
    waveformUrl: waveform ? waveformUrl(projectId, itemId) : null,
    waveform: waveform
      ? {
          peaksPerSecond: waveform.peaksPerSecond,
          peakCount: waveform.peakCount,
          durationSec: waveform.durationSec,
        }
      : null,
    state,
    error,
  };
}

async function runExtractAudio(opts: {
  projectId: string;
  itemId: string;
  sourcePath: string;
  durationSec: number | null;
  jobId?: string;
}): Promise<ExtractedAudioInfo> {
  const out = audioFilePath(opts.projectId, opts.itemId);
  const existing = await findExtractedAudio(opts.projectId, opts.itemId);
  if (existing) {
    // Idempotent: already on disk. Re-read the audio meta if possible.
    const meta = await readAudioMeta(opts.projectId, opts.itemId);
    if (meta) return meta;
  }

  const info = await extractAudio(opts.sourcePath, out, {
    durationSec: opts.durationSec,
    onProgress: (frac) => {
      if (!opts.jobId) return;
      // Extraction is the front half of overall progress.
      updateJob(opts.jobId, { progress: 0.05 + frac * 0.5 });
    },
  });
  await fs.writeFile(
    audioMetaPath(opts.projectId, opts.itemId),
    JSON.stringify(info, null, 2),
    "utf8",
  );
  return info;
}

async function readAudioMeta(
  projectId: string,
  itemId: string,
): Promise<ExtractedAudioInfo | null> {
  try {
    const raw = await fs.readFile(audioMetaPath(projectId, itemId), "utf8");
    return JSON.parse(raw) as ExtractedAudioInfo;
  } catch {
    return null;
  }
}

/* ===============================
   Sync analysis
================================ */

export interface SyncAnalyzeOptions {
  projectId: string;
  referenceItemId: string;
  candidateItemId: string;
  searchWindowSec?: number;
}

export async function runSyncAnalysis(
  opts: SyncAnalyzeOptions,
): Promise<SyncRecord> {
  const id = `${opts.referenceItemId}__${opts.candidateItemId}`;
  const now = () => new Date().toISOString();

  const refPeaks = await findPeaksFile(opts.projectId, opts.referenceItemId);
  const candPeaks = await findPeaksFile(opts.projectId, opts.candidateItemId);
  if (!refPeaks || !candPeaks) {
    return failedRecord(
      id,
      opts,
      "Waveform peaks missing for one or both sources. Wait for processing to finish.",
    );
  }

  const refData = await readWaveform(refPeaks.path);
  const candData = await readWaveform(candPeaks.path);
  if (!refData || !candData) {
    return failedRecord(id, opts, "Waveform peaks unreadable.");
  }

  let estimate: SyncEstimate;
  try {
    estimate = estimateOffset(refData, candData, {
      searchWindowSec: opts.searchWindowSec ?? 90,
    });
  } catch (e) {
    return failedRecord(id, opts, (e as Error).message || "sync failed");
  }

  const status: SyncStatus = classifyEstimate(estimate);
  return {
    id,
    referenceItemId: opts.referenceItemId,
    candidateItemId: opts.candidateItemId,
    status,
    estimate,
    error: null,
    computedAt: now(),
  };
}

function failedRecord(
  id: string,
  opts: SyncAnalyzeOptions,
  message: string,
): SyncRecord {
  return {
    id,
    referenceItemId: opts.referenceItemId,
    candidateItemId: opts.candidateItemId,
    status: "failed",
    estimate: null,
    error: message,
    computedAt: new Date().toISOString(),
  };
}

function detectKind(
  mimeType: string,
  probe: ProbeResult | null,
): "video" | "audio" {
  if (probe?.video) return "video";
  if (probe && probe.audio.length > 0 && !probe.video) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  // Fall back to video — it's the more featureful surface.
  return "video";
}

export type { MediaJob };
