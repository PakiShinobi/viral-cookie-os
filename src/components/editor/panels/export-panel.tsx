"use client";

import { EXPORT_PRESETS, presetById } from "@/lib/editor/presets";
import { formatPlayheadTime } from "@/lib/editor/timeline-math";
import { useEditorDoc, useEditorStore } from "@/lib/editor/use-editor";
import type { ExportPresetId } from "@/lib/editor/types";
import type { PodcastProject } from "@/lib/podcast/types";
import { useState } from "react";

/**
 * Export panel.
 *
 * Two sections:
 *   1. Export presets — fire-once long-form / audio targets.
 *   2. Viral clips — extract a 9:16 region from the current mark in/out.
 *
 * No real export runs from here. Each preset emits a future job description
 * that the ffmpeg + Remotion runner will consume. The UI focus is on
 * making the user feel like a professional rendering pipeline is one click
 * away.
 */

export function ExportPanel({ project }: { project: PodcastProject }) {
  const doc = useEditorDoc();
  const store = useEditorStore();
  const [clipLabel, setClipLabel] = useState("");
  const [clipPreset, setClipPreset] = useState<ExportPresetId>("vertical_reel");

  const hasMarks = doc.inPoint !== null && doc.outPoint !== null;
  const markRange =
    hasMarks && doc.inPoint !== null && doc.outPoint !== null
      ? Math.abs(doc.outPoint - doc.inPoint)
      : 0;
  const tooLong = markRange > 60;

  function makeClip() {
    if (!hasMarks) return;
    store.createViralClip(clipLabel, clipPreset);
    setClipLabel("");
  }

  return (
    <div className="space-y-5 p-3">
      {/* Project status */}
      <section className="rounded-lg border border-border bg-surface p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          Project status
        </p>
        <dl className="mt-2 space-y-1 font-mono text-[10px] uppercase tracking-[0.14em]">
          <Row label="Tracks" value={String(doc.tracks.length)} />
          <Row label="Clips" value={String(doc.clips.length)} />
          <Row
            label="Bin"
            value={`${project.mediaBin.length} source${project.mediaBin.length === 1 ? "" : "s"}`}
          />
          <Row label="Duration" value={formatPlayheadTime(doc.duration)} />
          <Row
            label="Aspect"
            value={doc.aspect}
            valueClass="text-foreground"
          />
        </dl>
      </section>

      {/* Long-form / audio export presets */}
      <section className="space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          Render presets
        </p>
        <ul className="space-y-1.5">
          {EXPORT_PRESETS.filter((p) => p.aspect === doc.aspect || p.format === "mp3").map(
            (p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="block w-full rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-foreground">
                      {p.name}
                    </p>
                    <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                      {p.format.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {p.aspect}
                    {p.format !== "mp3" && (
                      <>
                        <span className="px-1.5 text-border-strong">·</span>
                        {p.resolution.width}×{p.resolution.height}
                      </>
                    )}
                    <span className="px-1.5 text-border-strong">·</span>
                    {p.destination}
                  </p>
                </button>
              </li>
            ),
          )}
        </ul>
      </section>

      {/* Viral clip extraction */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
            Viral clip · 9:16
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            {hasMarks ? `${markRange.toFixed(1)}s region` : "No marks set"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <Row
              label="In"
              value={
                doc.inPoint === null
                  ? "—"
                  : formatPlayheadTime(doc.inPoint)
              }
              valueClass="text-foreground"
            />
            <Row
              label="Out"
              value={
                doc.outPoint === null
                  ? "—"
                  : formatPlayheadTime(doc.outPoint)
              }
              valueClass="text-foreground"
            />
          </div>

          <input
            value={clipLabel}
            onChange={(e) => setClipLabel(e.target.value)}
            placeholder="Hook moment label…"
            className="mt-3 block w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-foreground placeholder:text-muted/70 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={clipPreset}
              onChange={(e) =>
                setClipPreset(e.target.value as ExportPresetId)
              }
              className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {EXPORT_PRESETS.filter((p) => p.aspect === "9:16").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.destination}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={makeClip}
              disabled={!hasMarks || tooLong}
              className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              Make clip
            </button>
          </div>
          {tooLong && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-error/80">
              Region exceeds 60 s — viral clips are capped at 60s.
            </p>
          )}
          {!hasMarks && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted/80">
              Set mark in (I) and mark out (O) on the timeline.
            </p>
          )}
        </div>

        {/* Viral clip queue */}
        {doc.viralClips.length > 0 && (
          <ul className="space-y-1.5">
            {doc.viralClips.map((v) => (
              <li
                key={v.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="rounded bg-accent-subtle px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-accent">
                  {v.aspect}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-foreground">
                    {v.label}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {formatPlayheadTime(v.start)} → {formatPlayheadTime(v.end)}
                    <span className="px-1.5 text-border-strong">·</span>
                    {presetById(v.preset)?.destination}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => store.removeViralClip(v.id)}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted/70 transition-colors hover:text-error"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={valueClass ?? "text-foreground"}>{value}</dd>
    </div>
  );
}
