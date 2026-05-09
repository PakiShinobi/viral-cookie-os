import { PIPELINE_STAGE_META } from "@/lib/podcast/pipeline";
import type { PipelineStage, PodcastProject } from "@/lib/podcast/types";
import { PIPELINE_STAGES } from "@/lib/podcast/types";
import { StatusDot } from "./status-pill";

/**
 * PipelineRail — compact horizontal stage strip.
 *
 * Displays all six stages as numbered nodes joined by a connecting track.
 * Used on the project detail header and on project cards in lists.
 */

export function PipelineRail({
  pipeline,
  active,
  size = "md",
}: {
  pipeline: PodcastProject["pipeline"];
  active?: PipelineStage;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";

  return (
    <div className="relative flex items-center">
      {/* Track */}
      <div className="absolute inset-x-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-border" />

      <div className="relative z-10 flex w-full items-center justify-between">
        {PIPELINE_STAGES.map((stage) => {
          const meta = PIPELINE_STAGE_META[stage];
          const state = pipeline[stage];
          const isActive = active === stage;
          return (
            <div
              key={stage}
              className="flex flex-col items-center gap-1.5"
              title={`${meta.number}. ${meta.label} — ${state.status}`}
            >
              <div
                className={`flex items-center justify-center rounded-full border ${
                  isSm ? "h-5 w-5" : "h-6 w-6"
                } ${
                  state.status === "complete"
                    ? "border-success/40 bg-success/10"
                    : state.status === "in_progress"
                      ? "border-warning/40 bg-warning/10"
                      : state.status === "blocked"
                        ? "border-error/40 bg-error/10"
                        : state.status === "skipped"
                          ? "border-border-strong bg-surface-2/60"
                          : "border-border bg-surface-2"
                } ${isActive ? "ring-1 ring-accent" : ""}`}
              >
                {state.status === "complete" ? (
                  <svg
                    width={isSm ? "10" : "11"}
                    height={isSm ? "10" : "11"}
                    viewBox="0 0 12 12"
                    aria-hidden
                    className="text-success"
                  >
                    <path
                      d="M2.5 6.2L4.7 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span
                    className={`font-mono ${isSm ? "text-[9px]" : "text-[10px]"} font-medium ${
                      state.status === "in_progress"
                        ? "text-warning"
                        : state.status === "blocked"
                          ? "text-error"
                          : state.status === "skipped"
                            ? "text-muted/70"
                            : "text-muted"
                    }`}
                  >
                    {meta.number}
                  </span>
                )}
              </div>
              {!isSm && (
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                    isActive ? "text-foreground" : "text-muted"
                  }`}
                >
                  {meta.shortLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PipelineDots({
  pipeline,
}: {
  pipeline: PodcastProject["pipeline"];
}) {
  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STAGES.map((stage) => (
        <StatusDot key={stage} status={pipeline[stage].status} />
      ))}
    </div>
  );
}
