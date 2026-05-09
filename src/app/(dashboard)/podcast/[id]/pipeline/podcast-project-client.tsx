"use client";

import { ClipSuggestions } from "@/components/podcast/clip-suggestions";
import { MediaSlot } from "@/components/podcast/media-slot";
import { PipelineRail } from "@/components/podcast/pipeline-rail";
import { PipelineStageCard } from "@/components/podcast/pipeline-stage-card";
import { StatusPill } from "@/components/podcast/status-pill";
import {
  formatLongDate,
  formatRelativeDate,
  projectShortCode,
} from "@/lib/podcast/format";
import {
  countCompletedStages,
  countImportedMedia,
  currentStage,
  MEDIA_SLOTS,
  pipelineProgressPct,
  PIPELINE_STAGE_META,
} from "@/lib/podcast/pipeline";
import { removeProject } from "@/lib/podcast/services";
import type { PodcastProject } from "@/lib/podcast/types";
import { PIPELINE_STAGES } from "@/lib/podcast/types";
import { useProject } from "@/lib/podcast/use-podcast";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Project detail — the production pipeline command centre for one episode.
 *
 * Layout:
 *   - Project header: code, title, recorded-on, progress gauge
 *   - Pipeline rail (compact six-step strip)
 *   - Numbered stage cards stacked vertically with a continuous left rail
 *   - Clip suggestions surface after stage 5 completes
 *
 * Stages 2+ are blocked until import is complete; this is enforced by
 * `runPipelineAction` in the service layer.
 */

export function PodcastProjectClient({ projectId }: { projectId: string }) {
  const { project, ready } = useProject(projectId);
  const router = useRouter();

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-44 animate-pulse rounded-2xl border border-border bg-surface/40" />
      </div>
    );
  }

  if (!project) {
    return <ProjectMissing />;
  }

  const importLocked = project.pipeline.imported.status !== "complete";
  const active = currentStage(project.pipeline);

  function handleDelete() {
    if (!project) return;
    if (
      typeof window !== "undefined" &&
      window.confirm("Delete this project? This can't be undone.")
    ) {
      removeProject(project.id);
      router.push("/podcast");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <ProjectHeader project={project} onDelete={handleDelete} />

      <section className="rounded-2xl border border-border bg-surface px-5 py-4 sm:px-6">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Pipeline
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Active · {PIPELINE_STAGE_META[active].label}
          </p>
        </div>
        <PipelineRail pipeline={project.pipeline} active={active} />
      </section>

      <Stages project={project} importLocked={importLocked} active={active} />

      <ClipSuggestions suggestions={project.clipSuggestions} />

      <ProjectFooter project={project} />
    </div>
  );
}

function ProjectHeader({
  project,
  onDelete,
}: {
  project: PodcastProject;
  onDelete: () => void;
}) {
  const pct = pipelineProgressPct(project.pipeline);
  const completed = countCompletedStages(project.pipeline);
  const imported = countImportedMedia(project.media);

  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        <Link href="/podcast" className="transition-colors hover:text-foreground">
          Studio
        </Link>
        <span className="text-border-strong">/</span>
        <Link
          href={`/podcast/${project.id}`}
          className="transition-colors hover:text-foreground"
        >
          Editor
        </Link>
        <span className="text-border-strong">/</span>
        <span className="text-foreground">Pipeline</span>
        <span className="text-border-strong">·</span>
        <span>{projectShortCode(project.id)}</span>
        {project.episodeNumber && (
          <>
            <span className="text-border-strong">·</span>
            <span>EP {project.episodeNumber}</span>
          </>
        )}
        <span className="text-border-strong">·</span>
        <span>{formatLongDate(project.recordedAt)}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[38px]">
            {project.title}
          </h1>
          <p className="text-[14px] text-muted">
            {project.guests.length > 0
              ? `with ${project.guests.join(", ")}`
              : "Solo episode"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <ProgressDial pct={pct} />
          <div className="space-y-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <div>
              <span className="text-foreground">{imported}</span>/4 media
              imported
            </div>
            <div>
              <span className="text-foreground">{completed}</span>/6 stages
              complete
            </div>
            <div>
              Updated{" "}
              <span className="text-foreground">
                {formatRelativeDate(project.updatedAt)}
              </span>
            </div>
          </div>
          <Link
            href={`/podcast/${project.id}`}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Open editor
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-error/40 hover:text-error"
          >
            Delete
          </button>
        </div>
      </div>

      {project.notes && (
        <div className="rounded-xl border border-border bg-surface/70 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">
            {project.notes}
          </p>
        </div>
      )}
    </header>
  );
}

function ProgressDial({ pct }: { pct: number }) {
  const radius = 22;
  const stroke = 3;
  const c = 2 * Math.PI * radius;
  const dash = (pct / 100) * c;
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg className="absolute inset-0" viewBox="0 0 56 56" aria-hidden>
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 28 28)"
          className="text-accent transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="font-mono text-[12px] font-medium tabular-nums text-foreground">
        {pct}%
      </span>
    </div>
  );
}

function Stages({
  project,
  importLocked,
  active,
}: {
  project: PodcastProject;
  importLocked: boolean;
  active: ReturnType<typeof currentStage>;
}) {
  return (
    <section className="relative">
      {/* Continuous left rail joining all six stage numbers. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-6 left-[calc(1.25rem+1.5rem)] top-6 z-0 hidden w-px bg-border sm:block"
      />

      <ol className="relative z-10 space-y-4">
        {PIPELINE_STAGES.map((stage) => (
          <li key={stage}>
            <PipelineStageCard
              stage={stage}
              project={project}
              active={active === stage}
              blocked={stage !== "imported" && importLocked}
            >
              {stage === "imported" ? (
                <ImportedBody project={project} />
              ) : undefined}
            </PipelineStageCard>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ImportedBody({ project }: { project: PodcastProject }) {
  const filled = countImportedMedia(project.media);
  const allDone = filled === 4;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {MEDIA_SLOTS.map((m) => (
          <MediaSlot
            key={m.slot}
            projectId={project.id}
            slot={m.slot}
            asset={project.media[m.slot]}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {filled}/4 sources attached
          {allDone && (
            <>
              <span className="px-2 text-border-strong">·</span>
              <span className="text-success">Import complete</span>
            </>
          )}
        </p>
        <StatusPill
          status={allDone ? "complete" : filled > 0 ? "in_progress" : "pending"}
          label={allDone ? "Ready to sync" : "Awaiting media"}
        />
      </div>
    </div>
  );
}

function ProjectFooter({ project }: { project: PodcastProject }) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
      <span>
        Project ID
        <span className="px-1.5 text-border-strong">/</span>
        <span className="text-foreground">{project.id}</span>
      </span>
      <span>
        Created{" "}
        <span className="text-foreground">
          {formatRelativeDate(project.createdAt)}
        </span>
      </span>
    </footer>
  );
}

function ProjectMissing() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border bg-surface p-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Project not found
      </p>
      <h1 className="text-[24px] font-semibold tracking-tight text-foreground">
        This project doesn&apos;t exist or was removed.
      </h1>
      <p className="text-[13px] text-muted">
        Projects are stored locally in this browser. Try the studio hub or
        start a new project.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Link
          href="/podcast"
          className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          Back to studio
        </Link>
        <Link
          href="/podcast/new"
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          New project
        </Link>
      </div>
    </div>
  );
}
