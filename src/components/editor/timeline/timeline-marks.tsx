"use client";

import { timeToPx } from "@/lib/editor/timeline-math";
import type { EditorDoc } from "@/lib/editor/types";

/**
 * Mark in/out shading + saved viral clip ranges, drawn over the tracks
 * but under the playhead.
 */
export function TimelineMarks({
  doc,
  left,
  top,
}: {
  doc: EditorDoc;
  left: number;
  top: number;
}) {
  const inOut =
    doc.inPoint !== null && doc.outPoint !== null
      ? {
          start: Math.min(doc.inPoint, doc.outPoint),
          end: Math.max(doc.inPoint, doc.outPoint),
        }
      : null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ paddingTop: top }}
    >
      {/* Active mark in/out region */}
      {inOut && (
        <div
          className="absolute top-0 bottom-0 border-x border-accent/60 bg-accent/[0.06]"
          style={{
            left: left + timeToPx(inOut.start, doc.zoom),
            width: timeToPx(inOut.end - inOut.start, doc.zoom),
          }}
        />
      )}

      {/* Saved viral clip regions — subtle */}
      {doc.viralClips.map((v) => (
        <div
          key={v.id}
          className="absolute top-0 bottom-0 border-x border-success/40 bg-success/[0.04]"
          style={{
            left: left + timeToPx(v.start, doc.zoom),
            width: timeToPx(v.end - v.start, doc.zoom),
          }}
        >
          <span className="absolute top-1 left-1.5 rounded-sm bg-success/20 px-1 py-px font-mono text-[9px] uppercase tracking-[0.18em] text-success">
            {v.label.length > 18 ? v.label.slice(0, 18) + "…" : v.label}
          </span>
        </div>
      ))}

      {/* In flag */}
      {doc.inPoint !== null && (
        <Flag
          left={left + timeToPx(doc.inPoint, doc.zoom)}
          tone="accent"
          label="IN"
          side="left"
        />
      )}
      {doc.outPoint !== null && (
        <Flag
          left={left + timeToPx(doc.outPoint, doc.zoom)}
          tone="accent"
          label="OUT"
          side="right"
        />
      )}
    </div>
  );
}

function Flag({
  left,
  tone,
  label,
  side,
}: {
  left: number;
  tone: "accent";
  label: string;
  side: "left" | "right";
}) {
  void tone;
  return (
    <div
      className="absolute -top-1 z-10"
      style={{ left }}
    >
      <span
        className={`absolute top-0 inline-block rounded-[2px] bg-accent px-1 py-px font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] ${
          side === "left" ? "left-0" : "right-0 -translate-x-full"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
