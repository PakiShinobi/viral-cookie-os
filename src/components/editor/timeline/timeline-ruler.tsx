"use client";

import { timeToPx } from "@/lib/editor/timeline-math";

/**
 * Render a row of tick marks with labels on majors. Pure visual.
 */

export function TimelineRuler({
  ticks,
  zoom,
}: {
  ticks: Array<{ time: number; major: boolean }>;
  zoom: number;
}) {
  return (
    <div className="relative h-full">
      {ticks.map((t) => {
        const x = timeToPx(t.time, zoom);
        return (
          <div
            key={t.time}
            className="pointer-events-none absolute top-0 flex h-full flex-col items-start"
            style={{ left: x }}
          >
            <span
              className={
                t.major
                  ? "h-3.5 w-px bg-border-strong"
                  : "h-2 w-px bg-border"
              }
            />
            {t.major && (
              <span className="absolute left-1.5 top-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {formatRulerLabel(t.time)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatRulerLabel(t: number): string {
  if (t < 60) return `${t.toFixed(t % 1 === 0 ? 0 : 1)}s`;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
