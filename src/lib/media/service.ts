import "server-only";

import path from "node:path";
import { randomUUID } from "node:crypto";

import { failJob, succeedJob, updateJob } from "./jobs";
import { generateThumbnail } from "./thumbnail";
import { probeFile, summariseProbe } from "./probe";
import {
  ensureItemDir,
  itemDir,
  previewUrl,
  saveSourceStream,
  storageKey,
  thumbnailUrl,
  writeMetaFile,
  writeProbeFile,
} from "./storage";
import type { MediaImportResult, MediaJob, ProbeResult } from "./types";

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

  const result: MediaImportResult = {
    itemId,
    storageKey: storageKey(opts.projectId, itemId),
    previewUrl: previewUrl(opts.projectId, itemId),
    thumbnailUrl: thumbUrl,
    fileName: opts.fileName,
    fileSize: saved.size,
    mimeType: opts.mimeType,
    probe: summary,
  };

  if (jobId) succeedJob(jobId, result);
  return result;
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
