"use client";

import { PLATFORM_META, PIPELINE_STAGE_META } from "@/lib/podcast/pipeline";
import { runPipelineAction } from "@/lib/podcast/services";
import type { PipelineStage, PodcastProject } from "@/lib/podcast/types";
import { useTransition } from "react";
import { StatusPill } from "./status-pill";

/**
 * PipelineStageCard — one numbered stage in the production pipeline.
 *
 * Variants:
 *   - imported (stage 1) renders a media-slot grid via children, not action.
 *   - all other stages render their checklist + placeholder action button.
 *
 * The card itself is the visual unit. The detail page composes 6 of these
 * stacked vertically with a continuous track on the left.
 */

export function PipelineStageCard({
  stage,
  project,
  active,
  blocked,
  children,
}: {
  stage: PipelineStage;
  project: PodcastProject;
  active?: boolean;
  blocked?: boolean;
  /** Custom body (used by the Imported stage to render media slots). */
  children?: React.ReactNode;
}) {
  const meta = PIPELINE_STAGE_META[stage];
  const state = project.pipeline[stage];
  const [isPending, startTransition] = useTransition();

  const isInProgress = state.status === "in_progress" || isPending;
  const showAction =
    !children && state.status !== "complete";

  function handleAction() {
    startTransition(async () => {
      await runPipelineAction(project.id, stage);
    });
  }

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border transition-colors ${
        active
          ? "border-border-strong bg-surface"
          : state.status === "complete"
            ? "border-border bg-surface/70"
            : "border-border bg-surface"
      }`}
    >
      {/* Indeterminate scan line while running */}
      {isInProgress && (
        <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
          <div className="h-full w-1/3 animate-scan bg-gradient-to-r from-transparent via-warning to-transparent" />
        </div>
      )}

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Header */}
        <header className="flex items-start gap-5">
          <StageNumber
            number={meta.number}
            status={isPending ? "in_progress" : state.status}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                {meta.label}
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Stage 0{meta.number}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[13px] text-muted">
              {meta.description}
            </p>
          </div>
          <StatusPill status={isPending ? "in_progress" : state.status} />
        </header>

        {/* Body */}
        {children ? (
          children
        ) : (
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <Checklist
              items={meta.checklist}
              status={state.status}
            />
            <div className="flex flex-col items-stretch gap-2 md:items-end">
              {meta.targets.length > 0 && (
                <TargetList
                  targets={meta.targets.map((t) => PLATFORM_META[t].label)}
                />
              )}
              {showAction && (
                <ActionButton
                  label={
                    isPending || state.status === "in_progress"
                      ? meta.action.runningLabel
                      : meta.action.label
                  }
                  onClick={handleAction}
                  disabled={Boolean(blocked) || isPending}
                  running={isInProgress}
                />
              )}
              {state.status === "complete" && (
                <CompleteFootprint completedAt={state.completedAt} />
              )}
            </div>
          </div>
        )}

        {blocked && state.status !== "complete" && (
          <p className="font-mono text-[11px] text-error/80">
            Awaiting media import. Upload all four sources to unlock.
          </p>
        )}
      </div>
    </article>
  );
}

function StageNumber({
  number,
  status,
}: {
  number: number;
  status: "pending" | "in_progress" | "complete" | "blocked";
}) {
  const palette = {
    pending: {
      ring: "ring-border",
      text: "text-muted",
      bg: "bg-surface-2",
    },
    in_progress: {
      ring: "ring-warning/40",
      text: "text-warning",
      bg: "bg-warning/10",
    },
    complete: {
      ring: "ring-success/40",
      text: "text-success",
      bg: "bg-success/10",
    },
    blocked: {
      ring: "ring-error/40",
      text: "text-error",
      bg: "bg-error/10",
    },
  }[status];

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${palette.ring} ${palette.bg}`}
    >
      {status === "complete" ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          aria-hidden
          className={palette.text}
        >
          <path
            d="M3.5 9.5L7 13L14.5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span
          className={`font-mono text-[15px] font-medium tabular-nums ${palette.text}`}
        >
          {String(number).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function Checklist({
  items,
  status,
}: {
  items: readonly string[];
  status: "pending" | "in_progress" | "complete" | "blocked";
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 font-mono text-[11px] uppercase tracking-[0.08em]"
        >
          <span
            className={`mt-[3px] flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-[3px] border ${
              status === "complete"
                ? "border-success/50 bg-success/20"
                : "border-border-strong"
            }`}
          >
            {status === "complete" && (
              <svg
                width="6"
                height="6"
                viewBox="0 0 6 6"
                aria-hidden
                className="text-success"
              >
                <path
                  d="M1 3L2.5 4.5L5 1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span
            className={
              status === "complete"
                ? "text-muted line-through decoration-muted/40"
                : "text-foreground/85"
            }
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TargetList({ targets }: { targets: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 md:justify-end">
      {targets.map((t) => (
        <span
          key={t}
          className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  running,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  running?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group inline-flex items-center justify-center gap-2 self-start rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:self-end ${
        running
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-border-strong bg-surface-2 text-foreground hover:border-accent/50 hover:bg-accent-subtle hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      {running ? (
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-warning" />
      ) : (
        <svg
          width="11"
          height="11"
          viewBox="0 0 11 11"
          aria-hidden
          className="opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
        >
          <path
            d="M2 5.5H9M9 5.5L5.5 2M9 5.5L5.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function CompleteFootprint({ completedAt }: { completedAt: string | null }) {
  if (!completedAt) return null;
  const ts = new Date(completedAt);
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/80">
      Completed{" "}
      {ts.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </p>
  );
}
