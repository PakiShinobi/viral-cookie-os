/**
 * Browser-side helpers for talking to the media API.
 *
 * The upload helper uses XHR (not fetch) so we get progress events for
 * free during long uploads. Aborts cleanly when the caller signals a
 * cancellation.
 */

import type { MediaImportResult } from "./types";

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
