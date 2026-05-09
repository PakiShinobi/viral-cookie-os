"use client";

import { countImportedMedia } from "@/lib/podcast/pipeline";
import {
  getProjectAspect,
  getProjectClips,
  getProjectMediaBin,
} from "@/lib/podcast/migrate";
import { useProjects } from "@/lib/podcast/use-podcast";
import {
  formatRelativeDate,
  projectShortCode,
} from "@/lib/podcast/format";
import Link from "next/link";
import { EmptyProjects } from "./empty-projects";

/**
 * PodcastProjectsStrip — embeds podcast projects on supporting pages so
 * the Studio doesn't feel siloed. Two variants:
 *
 *   - "dashboard" : up to 3 most-recent projects in a grid + "View studio"
 *   - "list"      : a compact horizontal rail of project rows
 */

export function PodcastProjectsStrip({
  variant = "dashboard",
  limit = 3,
}: {
  variant?: "dashboard" | "list";
  limit?: number;
}) {
  const { projects, ready } = useProjects();

  if (!ready) {
    return (
      <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface/40" />
    );
  }

  if (projects.length === 0) {
    return <EmptyProjects variant="compact" />;
  }

  const shown = projects.slice(0, limit);
  const more = projects.length - shown.length;

  if (variant === "list") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Podcast projects
            <span className="ml-2 text-foreground">{projects.length}</span>
          </p>
          <Link
            href="/podcast"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-foreground"
          >
            Open studio →
          </Link>
        </header>
        <ul className="divide-y divide-border">
          {projects.map((p) => {
            const bin = getProjectMediaBin(p);
            const sources = bin.length || countImportedMedia(p.media);
            const clips = getProjectClips(p).length;
            const aspect = getProjectAspect(p);
            return (
              <li key={p.id}>
                <Link
                  href={`/podcast/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    {projectShortCode(p.id)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {p.title}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {sources} source{sources === 1 ? "" : "s"}
                      <span className="px-1.5 text-border-strong">·</span>
                      {clips} clip{clips === 1 ? "" : "s"}
                      <span className="px-1.5 text-border-strong">·</span>
                      {aspect}
                      <span className="px-1.5 text-border-strong">·</span>
                      {formatRelativeDate(p.updatedAt)}
                    </p>
                  </span>
                  <span className="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                    Open editor
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between border-b border-border pb-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Studio · Podcast projects
          </p>
          <h2 className="mt-1 text-[15px] font-semibold tracking-tight text-foreground">
            In production
          </h2>
        </div>
        <Link
          href="/podcast"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-foreground"
        >
          Open studio →
        </Link>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {shown.map((p) => {
          const bin = getProjectMediaBin(p);
          const sources = bin.length || countImportedMedia(p.media);
          const clips = getProjectClips(p).length;
          const aspect = getProjectAspect(p);
          return (
            <Link
              key={p.id}
              href={`/podcast/${p.id}`}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {projectShortCode(p.id)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  {aspect}
                </span>
              </div>
              <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                {p.title}
              </p>
              <div className="flex h-2 gap-1 overflow-hidden">
                {bin.slice(0, 6).map((m) => (
                  <span
                    key={m.id}
                    className="flex-1 rounded-sm"
                    style={{
                      background: `linear-gradient(90deg, ${m.color}99, ${m.color}33)`,
                    }}
                  />
                ))}
                {bin.length === 0 && (
                  <span className="flex-1 rounded-sm bg-surface-2" />
                )}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {sources} source{sources === 1 ? "" : "s"}
                <span className="px-1.5 text-border-strong">·</span>
                {clips} clip{clips === 1 ? "" : "s"}
                <span className="px-1.5 text-border-strong">·</span>
                {formatRelativeDate(p.updatedAt)}
              </p>
            </Link>
          );
        })}

        {more > 0 && (
          <Link
            href="/podcast"
            className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-6 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            +{more} more in studio →
          </Link>
        )}
      </div>
    </section>
  );
}
