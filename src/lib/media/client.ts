/**
 * Browser-side helpers for talking to the media API.
 *
 * The upload helper uses XHR (not fetch) so we get progress events for
 * free during long uploads. Aborts cleanly when the caller signals a
 * cancellation.
 */

import type {
  MediaImportResult,
  MediaJob,
  SyncRecord,
  WaveformData,
} from "./types";

export interface UploadProgress {
  phase: "uploading" | "processing";
  /** 0..1 inclusive. Null while we're past the upload phase. */
  uploaded: number | null;
  /** Bytes uploaded so far. */
  loaded: number;
  total: number;
}

export interface UploadOptions {
  projectId: string;
  file: File;
  /** "video" | "audio" hint, otherwise inferred server-side. */
  kind?: "video" | "audio";
  signal?: AbortSignal;
  onProgress?: (p: UploadProgress) => void;
}

export class MediaUploadError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MediaUploadError";
    this.status = status;
  }
}

export function uploadMedia(
  opts: UploadOptions,
): Promise<MediaImportResult> {
  return new Promise<MediaImportResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media/upload", true);
    xhr.responseType = "json";

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        reject(new MediaUploadError("Upload aborted", 0));
        return;
      }
      opts.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.upload.onprogress = (e) => {
      if (!opts.onProgress) return;
      if (!e.lengthComputable) {
        opts.onProgress({
          phase: "uploading",
          uploaded: null,
          loaded: e.loaded,
          total: opts.file.size,
        });
        return;
      }
      opts.onProgress({
        phase: "uploading",
        uploaded: e.total > 0 ? e.loaded / e.total : 0,
        loaded: e.loaded,
        total: e.total,
      });
    };

    xhr.upload.onload = () => {
      // Upload finished; server is now probing + thumbnailing.
      opts.onProgress?.({
        phase: "processing",
        uploaded: 1,
        loaded: opts.file.size,
        total: opts.file.size,
      });
    };

    xhr.onload = () => {
      const body = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300) {
        if (body && typeof body === "object" && "itemId" in body) {
          resolve(body as MediaImportResult);
          return;
        }
        reject(new MediaUploadError("Malformed response", xhr.status));
        return;
      }
      const message =
        body && typeof body === "object" && "error" in body
          ? String((body as { error?: unknown }).error)
          : `Upload failed (${xhr.status})`;
      reject(new MediaUploadError(message, xhr.status));
    };

    xhr.onerror = () => {
      reject(new MediaUploadError("Network error during upload", 0));
    };
    xhr.onabort = () => {
      reject(new MediaUploadError("Upload aborted", 0));
    };

    const form = new FormData();
    form.append("projectId", opts.projectId);
    if (opts.kind) form.append("kind", opts.kind);
    form.append("file", opts.file, opts.file.name);
    xhr.send(form);
  });
}

/* ===============================
   Job polling + sync
================================ */

export async function fetchJob(jobId: string): Promise<MediaJob | null> {
  const res = await fetch(`/api/media/jobs/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Job fetch failed (${res.status})`);
  return (await res.json()) as MediaJob;
}

export interface PollJobOptions {
  intervalMs?: number;
  /** Stop after this long. Default 10 minutes. */
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Per-tick callback for progress UIs. */
  onTick?: (job: MediaJob) => void;
}

/**
 * Poll a job until it terminates (succeeded / failed). Returns the
 * final job snapshot. Throws on timeout, abort, or HTTP failures.
 */
export async function pollJob(
  jobId: string,
  opts: PollJobOptions = {},
): Promise<MediaJob> {
  const intervalMs = opts.intervalMs ?? 600;
  const timeoutMs = opts.timeoutMs ?? 10 * 60_000;
  const started = Date.now();

  while (true) {
    if (opts.signal?.aborted) throw new Error("Poll aborted");
    const job = await fetchJob(jobId);
    if (!job) throw new Error("Job not found");
    opts.onTick?.(job);
    if (job.status === "succeeded" || job.status === "failed") return job;
    if (Date.now() - started > timeoutMs) throw new Error("Poll timed out");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export async function fetchWaveform(
  projectId: string,
  itemId: string,
): Promise<WaveformData | null> {
  const url = `/api/media/waveform/${encodeURIComponent(projectId)}/${encodeURIComponent(itemId)}`;
  const res = await fetch(url, { cache: "force-cache" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Waveform fetch failed (${res.status})`);
  return (await res.json()) as WaveformData;
}

export interface RunSyncRequest {
  projectId: string;
  referenceItemId: string;
  candidateItemId: string;
  searchWindowSec?: number;
  signal?: AbortSignal;
}

export async function runSync(req: RunSyncRequest): Promise<SyncRecord> {
  const res = await fetch("/api/media/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: req.projectId,
      referenceItemId: req.referenceItemId,
      candidateItemId: req.candidateItemId,
      searchWindowSec: req.searchWindowSec,
    }),
    signal: req.signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Sync failed (${res.status})`,
    );
  }
  return (await res.json()) as SyncRecord;
}

export async function triggerProcessing(
  projectId: string,
  itemId: string,
  kind: "video" | "audio" = "video",
): Promise<{ jobId: string }> {
  const res = await fetch(
    `/api/media/process/${encodeURIComponent(projectId)}/${encodeURIComponent(itemId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    },
  );
  if (!res.ok) {
    throw new Error(`Process trigger failed (${res.status})`);
  }
  return (await res.json()) as { jobId: string };
}
