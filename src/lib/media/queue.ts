import "server-only";

import { createJob, failJob, getJob, succeedJob, updateJob } from "./jobs";
import type { JobKind, MediaJob } from "./types";

/**
 * Tiny serial job queue layered on top of the in-memory job registry.
 *
 * Why serial:
 *   - ffmpeg jobs are CPU-heavy. Running 4+ concurrent transcodes on a
 *     dev machine starves the foreground process. Serial keeps the UI
 *     snappy and predictable.
 *
 * Why in-process:
 *   - The MVP is local-first. Replacing this with BullMQ / Redis later
 *     means swapping `enqueue()` to push onto a real queue and moving
 *     the worker to a separate process. Public surface stays the same.
 *
 * Globals are stashed on `globalThis` so dev-server hot reloads don't
 * orphan in-flight workers.
 */

type JobWork = (job: MediaJob) => Promise<unknown>;

interface QueueState {
  pending: { jobId: string; work: JobWork }[];
  busy: boolean;
}

const G = globalThis as typeof globalThis & { __vcosJobQueue?: QueueState };

function getState(): QueueState {
  if (!G.__vcosJobQueue) {
    G.__vcosJobQueue = { pending: [], busy: false };
  }
  return G.__vcosJobQueue;
}

export interface EnqueueOptions {
  projectId: string;
  itemId?: string | null;
  kind: JobKind;
  message?: string;
  /**
   * The work function. It receives the live job record so it can call
   * `updateJob` for progress. Whatever it returns is stashed as the
   * job's `result` on success.
   */
  work: JobWork;
}

export function enqueueJob(opts: EnqueueOptions): MediaJob {
  const job = createJob({
    projectId: opts.projectId,
    itemId: opts.itemId ?? null,
    kind: opts.kind,
    message: opts.message ?? null,
  });
  const state = getState();
  state.pending.push({ jobId: job.id, work: opts.work });
  scheduleTick();
  return job;
}

function scheduleTick(): void {
  // Defer to a microtask so the caller can return the queued job before
  // the work starts. This matters for tests and for routes that hand
  // out the job id then poll separately.
  Promise.resolve().then(() => void tick());
}

async function tick(): Promise<void> {
  const state = getState();
  if (state.busy) return;
  const next = state.pending.shift();
  if (!next) return;

  state.busy = true;
  const job = getJob(next.jobId);
  if (!job) {
    state.busy = false;
    void tick();
    return;
  }

  updateJob(job.id, {
    status: "running",
    progress: Math.max(job.progress, 0.01),
  });

  try {
    const result = await next.work(job);
    succeedJob(job.id, result);
  } catch (e) {
    failJob(job.id, (e as Error).message || "job failed");
  } finally {
    state.busy = false;
    // Drain the queue.
    void tick();
  }
}

/** Convenience wrapper: poll a job until it terminates. Server-side only. */
export async function awaitJob(
  jobId: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<MediaJob> {
  const intervalMs = opts.intervalMs ?? 250;
  const timeoutMs = opts.timeoutMs ?? 60 * 60_000;
  const started = Date.now();
  while (true) {
    const job = getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status === "succeeded" || job.status === "failed") return job;
    if (Date.now() - started > timeoutMs) throw new Error("awaitJob timed out");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
