"use client";

import { runSync } from "@/lib/media/client";
import {
  upsertSyncRecord,
  removeSyncRecord,
} from "@/lib/podcast/services";
import type {
  MediaBinItem,
  PodcastProject,
  ProjectSyncRecord,
} from "@/lib/podcast/types";
import { useState } from "react";

/**
 * Sync diagnostics surface.
 *
 * Lists each candidate source paired against a chosen reference. The
 * user can:
 *   - Run analysis for a pair (synchronous request hits /api/media/sync).
 *   - See offset, confidence, and method for the current best estimate.
 *   - Drop a stored record to re-run from scratch.
 *
 * The reference defaults to the first video source (the canonical
 * podcast multicam anchor); the user can pick any source if they want
 * to use it as the timing master instead.
 */
export function SyncDiagnostics({ project }: { project: PodcastProject }) {
  const candidates = project.mediaBin.filter(
    (b) => b.waveformReady && b.audioReady,
  );
  const defaultRef = candidates.find((b) => b.kind === "video") ?? candidates[0];
  const [referenceId, setReferenceId] = useState<string | null>(
    defaultRef?.id ?? null,
  );

  if (candidates.length < 2) {
    return (
      <p className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
        At least two analysed sources are needed to align audio. Wait for
        waveform processing to finish on each upload, then run sync.
      </p>
    );
  }

  const reference =
    candidates.find((b) => b.id === referenceId) ?? candidates[0];
  const others = candidates.filter((b) => b.id !== reference.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          Reference
        </p>
        <select
          value={reference.id}
          onChange={(e) => setReferenceId(e.target.value)}
          className="rounded border border-border bg-surface-2 px-2 py-1 text-[11px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <ul className="space-y-2">
        {others.map((cand) => (
          <SyncRow
            key={cand.id}
            project={project}
            reference={reference}
            candidate={cand}
          />
        ))}
      </ul>
    </div>
  );
}

function SyncRow({
  project,
  reference,
  candidate,
}: {
  project: PodcastProject;
  reference: MediaBinItem;
  candidate: MediaBinItem;
}) {
  const stored = findRecord(project.syncRecords, reference.id, candidate.id);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const record = await runSync({
        projectId: project.id,
        referenceItemId: reference.id,
        candidateItemId: candidate.id,
      });
      upsertSyncRecord(project.id, projectShape(record));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function handleClear() {
    if (!stored) return;
    removeSyncRecord(project.id, stored.id);
  }

  const status = stored?.status ?? "not_run";
  return (
    <li className="rounded-lg border border-border bg-surface-2/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-foreground">
            {candidate.label}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
            vs · {reference.label}
          </p>
        </div>
        <StatusPill status={status} />
      </div>

      {stored && stored.status === "ok" && (
        <SyncStats record={stored} />
      )}
      {stored && stored.status === "low_confidence" && (
        <>
          <SyncStats record={stored} />
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-warning">
            Confidence below threshold. Verify manually.
          </p>
        </>
      )}
      {stored && stored.status === "failed" && stored.error && (
        <p className="mt-1.5 text-[11px] text-error">{stored.error}</p>
      )}
      {error && (
        <p className="mt-1.5 text-[11px] text-error">{error}</p>
      )}

      <div className="mt-2 flex items-center justify-end gap-1.5">
        {stored && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className={`rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] transition-colors ${
            running
              ? "border-border bg-surface-2 text-muted opacity-60"
              : "border-accent/40 bg-accent-subtle text-accent hover:border-accent"
          }`}
        >
          {running ? "Running…" : stored ? "Re-run" : "Run"}
        </button>
      </div>
    </li>
  );
}

function SyncStats({ record }: { record: ProjectSyncRecord }) {
  const offset = record.offsetSec ?? 0;
  const confidence = Math.round((record.confidence ?? 0) * 100);
  const sign = offset >= 0 ? "+" : "";
  return (
    <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.14em]">
      <dt className="text-muted">Offset</dt>
      <dd className="text-foreground tabular-nums">
        {sign}
        {offset.toFixed(3)}s
      </dd>
      <dt className="text-muted">Confidence</dt>
      <dd className="text-foreground tabular-nums">{confidence}%</dd>
    </dl>
  );
}

function StatusPill({ status }: { status: ProjectSyncRecord["status"] }) {
  const m: Record<ProjectSyncRecord["status"], { label: string; cls: string }> = {
    not_run: { label: "Idle", cls: "border-border bg-surface text-muted" },
    running: {
      label: "Running",
      cls: "border-accent/40 bg-accent-subtle text-accent",
    },
    ok: {
      label: "Locked",
      cls: "border-success/40 bg-success/10 text-success",
    },
    low_confidence: {
      label: "Soft",
      cls: "border-warning/40 bg-warning/10 text-warning",
    },
    failed: { label: "Failed", cls: "border-error/40 bg-error/10 text-error" },
  };
  const meta = m[status];
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function findRecord(
  records: ProjectSyncRecord[],
  refId: string,
  candId: string,
): ProjectSyncRecord | null {
  return (
    records.find(
      (r) =>
        (r.referenceItemId === refId && r.candidateItemId === candId) ||
        (r.referenceItemId === candId && r.candidateItemId === refId),
    ) ?? null
  );
}

/**
 * Translate the server-shaped `SyncRecord` into the project-persisted
 * shape. Keeping these distinct lets the project schema stay free of
 * server-only fields.
 */
function projectShape(
  record: import("@/lib/media/types").SyncRecord,
): ProjectSyncRecord {
  return {
    id: record.id,
    referenceItemId: record.referenceItemId,
    candidateItemId: record.candidateItemId,
    status: record.status,
    offsetSec: record.estimate?.offsetSec ?? null,
    confidence: record.estimate?.confidence ?? null,
    peakRatio: record.estimate?.peakRatio ?? null,
    searchWindowSec: record.estimate?.searchWindowSec ?? null,
    method: record.estimate?.method ?? null,
    error: record.error,
    computedAt: record.computedAt,
  };
}
