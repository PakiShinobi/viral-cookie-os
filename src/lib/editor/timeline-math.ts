import type { EditorClip, EditorDoc } from "./types";

/**
 * Pure timeline math. No React. No DOM. Used by the store and by hit-testing
 * helpers in the timeline UI.
 *
 * Everything operates in seconds. Pixel<->time conversion goes through
 * the document's `zoom` field (pixels per second).
 */

export const MIN_ZOOM = 8; // pixels per second
export const MAX_ZOOM = 240;
export const DEFAULT_ZOOM = 60;

export function pxToTime(px: number, zoom: number): number {
  return px / zoom;
}

export function timeToPx(time: number, zoom: number): number {
  return time * zoom;
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Build the list of snap candidate times for the given drag context.
 * Excluded clips (the dragged ones) shouldn't snap to themselves.
 */
export function snapTargets(
  doc: EditorDoc,
  excludeIds: string[],
): Array<{ time: number; target: "playhead" | "clip-edge" | "marker" | "in" | "out" }> {
  const targets: ReturnType<typeof snapTargets> = [];
  targets.push({ time: 0, target: "clip-edge" });
  targets.push({ time: doc.playhead, target: "playhead" });
  if (doc.inPoint !== null) targets.push({ time: doc.inPoint, target: "in" });
  if (doc.outPoint !== null)
    targets.push({ time: doc.outPoint, target: "out" });
  for (const m of doc.markers) {
    targets.push({ time: m.time, target: "marker" });
  }
  for (const c of doc.clips) {
    if (excludeIds.includes(c.id)) continue;
    targets.push({ time: c.start, target: "clip-edge" });
    targets.push({ time: c.start + c.duration, target: "clip-edge" });
  }
  return targets;
}

/**
 * Snap `time` to the nearest target within `pxTolerance` pixels at the
 * current zoom level. Returns the (possibly snapped) time and a flag.
 */
export function snapTime(
  doc: EditorDoc,
  time: number,
  excludeIds: string[],
): { time: number; snapped: boolean; target: "playhead" | "clip-edge" | "marker" | "in" | "out" | null } {
  if (!doc.snapEnabled) {
    return { time, snapped: false, target: null };
  }
  const tol = doc.snapPixels / doc.zoom;
  let best: { d: number; t: number; target: "playhead" | "clip-edge" | "marker" | "in" | "out" } | null = null;
  for (const c of snapTargets(doc, excludeIds)) {
    const d = Math.abs(c.time - time);
    if (d <= tol && (best === null || d < best.d)) {
      best = { d, t: c.time, target: c.target };
    }
  }
  if (!best) return { time, snapped: false, target: null };
  return { time: best.t, snapped: true, target: best.target };
}

/** Compute the natural total duration the timeline must show. */
export function computeContentDuration(doc: EditorDoc): number {
  let max = 0;
  for (const c of doc.clips) {
    const end = c.start + c.duration;
    if (end > max) max = end;
  }
  for (const m of doc.markers) {
    if (m.time > max) max = m.time;
  }
  return Math.max(max, doc.duration);
}

/**
 * Generate ruler tick positions appropriate for the current zoom.
 * Returns an array of `{ time, major }` ticks within the visible range.
 */
export function rulerTicks(
  zoom: number,
  startSec: number,
  endSec: number,
): Array<{ time: number; major: boolean }> {
  // Aim for a tick every ~80px and a major every ~160px.
  const pxBetweenMinor = 80;
  const minorStep = niceStep(pxBetweenMinor / zoom);
  const majorStep = minorStep * 5;
  const ticks: Array<{ time: number; major: boolean }> = [];
  const first = Math.floor(startSec / minorStep) * minorStep;
  for (let t = first; t <= endSec + minorStep / 2; t += minorStep) {
    const isMajor = Math.abs(t / majorStep - Math.round(t / majorStep)) < 1e-6;
    ticks.push({ time: roundTo(t, 6), major: isMajor });
  }
  return ticks;
}

function niceStep(seconds: number): number {
  const candidates = [
    0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600,
  ];
  for (const c of candidates) if (c >= seconds) return c;
  return 3600;
}

function roundTo(n: number, decimals: number): number {
  const m = 10 ** decimals;
  return Math.round(n * m) / m;
}

/**
 * Determine whether a clip at `start..start+duration` overlaps any other
 * clip on the same track (used to validate moves). Excludes self.
 */
export function hasOverlap(
  clips: EditorClip[],
  trackId: string,
  start: number,
  end: number,
  excludeId: string | null,
): boolean {
  for (const c of clips) {
    if (c.trackId !== trackId) continue;
    if (c.id === excludeId) continue;
    const cStart = c.start;
    const cEnd = c.start + c.duration;
    if (start < cEnd && end > cStart) return true;
  }
  return false;
}

/**
 * Format a duration as a fixed-width timecode HH:MM:SS.ff or MM:SS.ff,
 * used in the editor top bar and inspector. The fractional part shows
 * centiseconds so it's easy to read while scrubbing.
 */
export function formatPlayheadTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const total = Math.floor(safe * 100);
  const cs = total % 100;
  const s = Math.floor(total / 100) % 60;
  const m = Math.floor(total / 6000) % 60;
  const h = Math.floor(total / 360000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}
