import "server-only";

import { randomUUID } from "node:crypto";

import type { JobKind, JobStatus, MediaJob } from "./types";

/**
 * In-memory job registry.
 *
 * MVP scope: jobs only need to live during a single request lifecycle
 * (synchronous import) or for the duration of a long-running ffmpeg
 * pipeline (sync, render, export). Jobs are wiped when the process
 * restarts — they are intentionally NOT a durable queue.
 *
 * The shape is forwards-compatible: when we move to a real queue
 * (BullMQ, Redis, SQS), the public API stays the same.
 *
 * Globals are stashed on `globalThis` so dev-server hot reloads don't
 * orphan in-flight jobs.
 */

const G = globalThis as typeof globalThis & { __vcosJobStore?: JobStore };

interface JobStore {
  jobs: Map<string, MediaJob>;
  /** id -> set of subscriber callbacks. */
  watchers: Map<string, Set<(job: MediaJob) => void>>;
}

function getStore(): JobStore {
  if (!G.__vcosJobStore) {
    G.__vcosJobStore = { jobs: new Map(), watchers: new Map() };
  }
  return G.__vcosJobStore;
}

export function createJob(opts: {
  projectId: string;
  itemId?: string | null;
  kind: JobKind;
  message?: string | null;
}): MediaJob {
  const id = randomUUID();
  const job: MediaJob = {
    id,
    projectId: opts.projectId,
    itemId: opts.itemId ?? null,
    kind: opts.kind,
    status: "queued",
    progress: 0,
    message: opts.message ?? null,
    error: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    result: null,
  };
  getStore().jobs.set(id, job);
  return job;
}

export function getJob(id: string): MediaJob | null {
  return getStore().jobs.get(id) ?? null;
}

export function listJobs(projectId?: string): MediaJob[] {
  const jobs = [...getStore().jobs.values()];
  return projectId ? jobs.filter((j) => j.projectId === projectId) : jobs;
}

export function updateJob(
  id: string,
  patch: Partial<Omit<MediaJob, "id" | "startedAt">>,
): MediaJob | null {
  const store = getStore();
  const prev = store.jobs.get(id);
  if (!prev) return null;
  const isTerminal: JobStatus[] = ["succeeded", "failed"];
  const finished = patch.status && isTerminal.includes(patch.status);
  const next: MediaJob = {
    ...prev,
    ...patch,
    finishedAt: finished
      ? patch.finishedAt ?? new Date().toISOString()
      : prev.finishedAt,
    progress:
      typeof patch.progress === "number"
        ? clamp01(patch.progress)
        : prev.progress,
  };
  store.jobs.set(id, next);
  notify(id, next);
  return next;
}

export function failJob(id: string, error: string): MediaJob | null {
  return updateJob(id, {
    status: "failed",
    error,
    progress: 1,
  });
}

export function succeedJob(id: string, result: unknown): MediaJob | null {
  return updateJob(id, {
    status: "succeeded",
    result,
    progress: 1,
    error: null,
  });
}

export function watchJob(
  id: string,
  cb: (job: MediaJob) => void,
): () => void {
  const store = getStore();
  let set = store.watchers.get(id);
  if (!set) {
    set = new Set();
    store.watchers.set(id, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
    if (set && set.size === 0) store.watchers.delete(id);
  };
}

function notify(id: string, job: MediaJob): void {
  const set = getStore().watchers.get(id);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(job);
    } catch {
      /* watcher errors are isolated */
    }
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
