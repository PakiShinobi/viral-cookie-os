"use client";

import { timeToPx } from "@/lib/editor/timeline-math";

/**
 * Playhead — vertical line + diamond head that rides above the ruler.
 */
export function TimelinePlayhead({
  time,
  zoom,
  left,
  top,
}: {
  time: number;
  zoom: number;
  left: number;
  top: number;
}) {
  const x = left + timeToPx(time, zoom);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20"
      style={{ left: x, top, bottom: 0 }}
    >
      <div className="absolute -left-px top-0 h-full w-px bg-accent" />
      <div className="absolute -left-1.5 -top-px h-3 w-3 rotate-45 rounded-[2px] bg-accent shadow-[0_0_0_2px_rgba(15,15,20,1)]" />
    </div>
  );
}
