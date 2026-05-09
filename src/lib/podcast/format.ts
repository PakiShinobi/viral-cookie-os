/**
 * Pure formatting helpers for podcast UI: sizes, durations, dates, codes.
 *
 * Numeric output is intentionally monospace-friendly — pad to fixed widths
 * so values align in tables and stage cards.
 */

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const fixed = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(fixed)} ${units[unit]}`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return "—:—:—";
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const delta = Date.now() - then;
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (delta < min) return "just now";
  if (delta < hour) return `${Math.floor(delta / min)}m ago`;
  if (delta < day) return `${Math.floor(delta / hour)}h ago`;
  if (delta < 7 * day) return `${Math.floor(delta / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(iso).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  });
}

export function formatLongDate(iso: string | null): string {
  if (!iso) return "Not recorded";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Short 6-char project code for chrome — `pod_xxx` -> `XXXX-XX`. */
export function projectShortCode(id: string): string {
  const tail = id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  if (tail.length < 4) return tail.padEnd(6, "0");
  return `${tail.slice(0, 4)}-${tail.slice(4)}`;
}
