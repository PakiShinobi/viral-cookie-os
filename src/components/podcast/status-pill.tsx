import type { StageStatus } from "@/lib/podcast/types";

/**
 * Single source of truth for stage status visuals.
 * - pending  : muted, hollow circle
 * - in_progress : amber pulsing dot
 * - complete : emerald check
 * - blocked  : rose hollow square
 */

const STATUS_LABEL: Record<StageStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  complete: "Complete",
  blocked: "Blocked",
};

const STATUS_TONE: Record<
  StageStatus,
  { dot: string; text: string; bg: string; border: string }
> = {
  pending: {
    dot: "bg-muted/40",
    text: "text-muted",
    bg: "bg-surface-2",
    border: "border-border",
  },
  in_progress: {
    dot: "bg-warning animate-pulse-dot",
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  complete: {
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  blocked: {
    dot: "bg-error",
    text: "text-error",
    bg: "bg-error/10",
    border: "border-error/30",
  },
};

export function StatusPill({
  status,
  label,
}: {
  status: StageStatus;
  label?: string;
}) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${tone.border} ${tone.bg} px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${tone.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

export function StatusDot({ status }: { status: StageStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      aria-label={STATUS_LABEL[status]}
      className={`inline-block h-2 w-2 rounded-full ${tone.dot}`}
    />
  );
}

export function statusToneFor(status: StageStatus) {
  return STATUS_TONE[status];
}
