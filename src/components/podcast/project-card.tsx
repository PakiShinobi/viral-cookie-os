import {
  formatLongDate,
  formatRelativeDate,
  projectShortCode,
} from "@/lib/podcast/format";
import { countImportedMedia } from "@/lib/podcast/pipeline";
import type { PodcastProject } from "@/lib/podcast/types";
import Link from "next/link";

/**
 * ProjectCard — single project tile for the studio hub.
 *
 * Editor-first redesign: the card emphasises the editor doc (clips, aspect,
 * viral clips queued) instead of the pipeline progress. Clicking the card
 * opens the editor; a small chip jumps to the production tracker.
 */

export function ProjectCard({ project }: { project: PodcastProject }) {
  const importedCount =
    project.mediaBin.length || countImportedMedia(project.media);
  const clipCount = project.editor?.clips.length ?? 0;
  const viralCount = project.editor?.viralClips.length ?? 0;
  const aspect = project.editor?.aspect ?? "16:9";
  const hasContent = importedCount > 0;
  const code = projectShortCode(project.id);
  const href = hasContent
    ? `/podcast/${project.id}`
    : `/podcast/${project.id}/import`;

  return (
    <article className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-border-strong">
      <Link
        href={href}
        className="absolute inset-0 z-0"
        aria-label={`Open ${project.title}`}
      />

      <header className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            {code}
            {project.episodeNumber && (
              <>
                <span className="px-1.5 text-border-strong">·</span>
                EP {project.episodeNumber}
              </>
            )}
            <span className="px-1.5 text-border-strong">·</span>
            <span>{aspect}</span>
          </p>
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {project.title}
          </h3>
          <p className="text-[12px] text-muted">
            {project.guests.length > 0
              ? `with ${project.guests.join(", ")}`
              : "Solo episode"}
            <span className="px-1.5 text-border-strong">·</span>
            {formatLongDate(project.recordedAt)}
          </p>
        </div>
      </header>

      <ProjectFilmstrip project={project} />

      <footer className="relative z-10 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          <span>
            <span className="text-foreground">{importedCount}</span> sources
          </span>
          <span>
            <span className="text-foreground">{clipCount}</span> clips
          </span>
          <span>
            <span className="text-foreground">{viralCount}</span> reels
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/podcast/${project.id}/pipeline`}
            className="relative z-10 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            Pipeline
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {formatRelativeDate(project.updatedAt)}
          </span>
        </div>
      </footer>
    </article>
  );
}

/**
 * Mini filmstrip preview: shows up to 6 imported sources as colored bars.
 * For an empty project, shows a hint to import. When the editor doc has
 * clips, we show a tiny clip strip representing the timeline density.
 */
function ProjectFilmstrip({ project }: { project: PodcastProject }) {
  const aspect = project.editor?.aspect ?? "16:9";
  const sources = project.mediaBin.slice(0, 8);
  const clips = project.editor?.clips ?? [];

  if (sources.length === 0) {
    return (
      <div className="relative z-10 flex items-center justify-between rounded-xl border border-dashed border-border bg-surface-2/40 px-3 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          No media yet
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
          Import →
        </span>
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-1.5">
      {/* Filmstrip of source colours */}
      <div className="flex h-10 gap-1 overflow-hidden rounded-lg border border-border bg-surface-2/40 p-1">
        {sources.map((m) => (
          <span
            key={m.id}
            className="flex-1 rounded-md"
            style={{
              background: `linear-gradient(135deg, ${m.color}40, ${m.color}10)`,
              borderLeft: `2px solid ${m.color}`,
            }}
            title={m.label}
          />
        ))}
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
        {clips.length > 0
          ? `${clips.length} clip${clips.length === 1 ? "" : "s"} on timeline · ${aspect}`
          : `${sources.length} source${sources.length === 1 ? "" : "s"} ready · ${aspect}`}
      </p>
    </div>
  );
}
