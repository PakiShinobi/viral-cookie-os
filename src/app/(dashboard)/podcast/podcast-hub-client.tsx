"use client";

import { ProjectCard } from "@/components/podcast/project-card";
import { EmptyProjects } from "@/components/podcast/empty-projects";
import {
  getProjectClips,
  getProjectMediaBin,
  getProjectViralClips,
} from "@/lib/podcast/migrate";
import { countImportedMedia } from "@/lib/podcast/pipeline";
import { useProjects } from "@/lib/podcast/use-podcast";
import Link from "next/link";

/**
 * The podcast studio hub — primary entry point for the podcast workflow.
 *
 * Projects-first layout:
 *   - Studio header (with operational metadata)
 *   - Empty zero-state OR active projects grid
 *   - Production pipeline overview band
 *
 * State lives in the browser (see lib/podcast/storage.ts) so writes work even
 * while server-side auth is bypassed. Replace with Supabase later behind the
 * same service surface.
 */

export function PodcastHubClient() {
  const { projects, ready } = useProjects();

  const totalProjects = projects.length;
  const totalSources = projects.reduce(
    (sum, p) => sum + (getProjectMediaBin(p).length || countImportedMedia(p.media)),
    0,
  );
  const totalClips = projects.reduce(
    (sum, p) => sum + getProjectClips(p).length,
    0,
  );
  const totalReels = projects.reduce(
    (sum, p) => sum + getProjectViralClips(p).length,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <StudioHeader
        totalProjects={totalProjects}
        totalSources={totalSources}
        totalClips={totalClips}
        totalReels={totalReels}
      />

      <section className="space-y-4">
        <SectionLabel
          label="Active projects"
          count={totalProjects}
          action={
            totalProjects > 0 ? (
              <Link
                href="/podcast/new"
                className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                + New project
              </Link>
            ) : null
          }
        />

        {!ready ? (
          <SkeletonGrid />
        ) : totalProjects === 0 ? (
          <EmptyProjects />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel label="Editor flow" />
        <EditorFlowOverview />
      </section>
    </div>
  );
}

function StudioHeader({
  totalProjects,
  totalSources,
  totalClips,
  totalReels,
}: {
  totalProjects: number;
  totalSources: number;
  totalClips: number;
  totalReels: number;
}) {
  const sessionCode =
    typeof window !== "undefined"
      ? new Date().toISOString().slice(0, 10).replace(/-/g, "")
      : "";

  return (
    <header className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Studio · Editor
            {sessionCode && (
              <>
                <span className="px-2 text-border-strong">/</span>
                Session {sessionCode}
              </>
            )}
          </p>
          <h1 className="text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[40px]">
            Podcast Studio
          </h1>
          <p className="max-w-xl text-[14px] leading-relaxed text-muted">
            CapCut-grade editing built for podcasts and viral clips. Drop
            your sources, cut on a multi-track timeline, then ship long-form
            and 9:16 reels from the same project.
          </p>
        </div>

        <Link
          href="/podcast/new"
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          New podcast project
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active projects" value={totalProjects} />
        <Stat label="Sources imported" value={totalSources} />
        <Stat label="Clips on timeline" value={totalClips} />
        <Stat label="Reels queued" value={totalReels} />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  suffix,
  mono,
}: {
  label: string;
  value: number;
  suffix?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p
        className={`mt-2 ${
          mono ? "font-mono" : ""
        } text-[24px] font-medium tabular-nums tracking-tight text-foreground`}
      >
        {value}
        {suffix && (
          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

function SectionLabel({
  label,
  count,
  action,
}: {
  label: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        {label}
        {typeof count === "number" && (
          <span className="ml-2 text-foreground">{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}

function EditorFlowOverview() {
  const steps = [
    { num: "01", label: "Import", body: "Video 1 required · mics optional" },
    { num: "02", label: "Sync", body: "Auto-skipped on single-source" },
    { num: "03", label: "Editor", body: "Multi-track timeline & overlays" },
    { num: "04", label: "Audio Export", body: "Clean MP3 master" },
    { num: "05", label: "Viral Clips", body: "Mark in/out · 9:16 reels" },
    { num: "06", label: "Distribution", body: "Stage every output" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      {steps.map((s) => (
        <div
          key={s.num}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {s.num}
          </p>
          <p className="mt-2 text-[13px] font-medium text-foreground">
            {s.label}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {s.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-2xl border border-border bg-surface/50"
        />
      ))}
    </div>
  );
}
