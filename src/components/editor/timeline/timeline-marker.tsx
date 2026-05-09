"use client";

import { timeToPx } from "@/lib/editor/timeline-math";
import type { Marker } from "@/lib/editor/types";

const MARKER_TONE: Record<
  Marker["kind"],
  { color: string; label: string }
> = {
  sponsor: { color: "#f59e0b", label: "Sponsor" },
  chapter: { color: "#06b6d4", label: "Chapter" },
  highlight: { color: "#a855f7", label: "Highlight" },
  subscribe_cta: { color: "#f43f5e", label: "Subscribe" },
};

export function TimelineMarker({
  marker,
  zoom,
}: {
  marker: Marker;
  zoom: number;
}) {
  const left = timeToPx(marker.time, zoom);
  const tone = MARKER_TONE[marker.kind];
  return (
    <div
      className="absolute top-1 flex items-center gap-1.5 rounded-md px-2 py-1"
      style={{
        left,
        background: `${tone.color}1f`,
        border: `1px solid ${tone.color}55`,
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: tone.color }}
      />
      <span
        className="font-mono text-[9px] uppercase tracking-[0.18em]"
        style={{ color: tone.color }}
      >
        {marker.label || tone.label}
      </span>
    </div>
  );
}
