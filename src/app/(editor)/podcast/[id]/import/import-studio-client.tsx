"use client";

import {
  addBinItem,
  probeMediaDuration,
  removeBinItem,
  removeProject,
  updateProjectTitle,
} from "@/lib/podcast/services";
import { useProject } from "@/lib/podcast/use-podcast";
import { formatBytes, formatDuration } from "@/lib/podcast/format";
import type { MediaBinItem, PodcastProject } from "@/lib/podcast/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  useId,
  useState,
} from "react";

/**
 * Import Studio.
 *
 * The first thing the user sees after clicking "New Podcast". One required
 * primary video; everything else is optional. When the user clicks
 * "Continue to editor" we route to the editor — it boots its own document.
 *
 * The import surface is intentionally generous: drop multiple files at
 * once, drag onto any zone, paste from the OS, or use the file picker.
 * No metadata form, no opinion about cameras vs cameras vs mics.
 */

export function ImportStudioClient({ projectId }: { projectId: string }) {
  const { project } = useProject(projectId);
  const router = useRouter();

  if (!project) {
    return <ProjectMissing />;
  }

  const videoCount = project.mediaBin.filter((m) => m.kind === "video").length;
  const audioCount = project.mediaBin.filter((m) => m.kind === "audio").length;
  const hasVideo = videoCount >= 1;
  const totalSources = project.mediaBin.length;
  const syncEnabled = totalSources > 1;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ImportHeader project={project} />
      <main className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <ImportZone project={project} />
            <ImportSidebar
              videoCount={videoCount}
              audioCount={audioCount}
              syncEnabled={syncEnabled}
            />
          </div>

          {totalSources > 0 && (
            <BinList
              project={project}
              onRemove={(mid) => removeBinItem(project.id, mid)}
            />
          )}
        </div>
      </main>
      <ImportFooter
        project={project}
        canContinue={hasVideo}
        syncEnabled={syncEnabled}
        onCancel={() => {
          if (
            window.confirm(
              "Discard this draft project and return to the studio?",
            )
          ) {
            removeProject(project.id);
            router.push("/podcast");
          }
        }}
        onContinue={() => router.push(`/podcast/${project.id}`)}
      />
    </div>
  );
}

function ImportHeader({ project }: { project: PodcastProject }) {
  const [title, setTitle] = useState(project.title);
  const [editing, setEditing] = useState(false);

  function commit() {
    setEditing(false);
    if (title.trim() && title.trim() !== project.title) {
      updateProjectTitle(project.id, title);
    } else {
      setTitle(project.title);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
      <Link
        href="/podcast"
        className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-1.5 transition-colors hover:border-border-strong"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-accent text-[9px] font-bold text-white">
          VC
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Studio
        </span>
      </Link>
      <span className="text-border-strong">/</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Import
      </span>
      <div className="ml-auto">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setTitle(project.title);
                setEditing(false);
              }
            }}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[13px] font-medium text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2 py-1 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-2"
          >
            {project.title}
          </button>
        )}
      </div>
    </header>
  );
}

function ImportZone({ project }: { project: PodcastProject }) {
  const [hovering, setHovering] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  async function handleFiles(files: FileList | File[]) {
    setBusy(true);
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      if (!isVideo && !isAudio) continue;
      const kind = isVideo ? "video" : "audio";
      const duration = await probeMediaDuration(
        file,
        kind === "video" ? "video" : "audio",
      );
      addBinItem(project.id, file, kind, duration);
    }
    setBusy(false);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Step 1 · Import
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[34px]">
          Bring your raw media in.
        </h1>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">
          One video file is enough. Drop additional cameras, mic feeds, or
          music — anything you might cut against on the timeline.
        </p>
      </div>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={onDrop}
        className={`relative block cursor-pointer rounded-2xl border border-dashed p-10 transition-colors ${
          hovering
            ? "border-accent/60 bg-accent-subtle"
            : "border-border-strong bg-surface/60 hover:border-border-strong hover:bg-surface"
        }`}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <DropGlyph hovering={hovering} />
          <div>
            <p className="text-[16px] font-semibold text-foreground">
              {busy ? "Reading metadata…" : "Drop files to import"}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              MP4 · MOV · WAV · MP3 · multi-select
            </p>
          </div>
          <span className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-foreground">
            Or browse files
          </span>
        </div>
        <input
          id={inputId}
          type="file"
          multiple
          accept="video/*,audio/*"
          className="sr-only"
          onChange={onChange}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Hint>1 video minimum</Hint>
        <Hint>2 cameras unlocks multicam</Hint>
        <Hint>2+ sources unlock auto-sync</Hint>
      </div>
    </section>
  );
}

function ImportSidebar({
  videoCount,
  audioCount,
  syncEnabled,
}: {
  videoCount: number;
  audioCount: number;
  syncEnabled: boolean;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Session
        </p>
        <dl className="space-y-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <Row label="Video sources" value={String(videoCount)} highlight={videoCount > 0} />
          <Row label="Audio sources" value={String(audioCount)} highlight={audioCount > 0} />
          <Row
            label="Sync stage"
            value={syncEnabled ? "Enabled" : "Skipped"}
            highlight={syncEnabled}
          />
        </dl>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Up next
        </p>
        <ol className="space-y-2 text-[12px] text-muted">
          <Step n="01" title="Editor opens" hint="Tracks ready, snap on" />
          <Step
            n="02"
            title={syncEnabled ? "Auto-align mics to cam" : "Sync skipped"}
            hint={syncEnabled ? "Multi-source detected" : "Single source"}
          />
          <Step n="03" title="Trim, switch, overlay" hint="Inspector + timeline" />
          <Step n="04" title="Cut viral clips" hint="Mark in / out → 9:16" />
        </ol>
      </div>
    </aside>
  );
}

function BinList({
  project,
  onRemove,
}: {
  project: PodcastProject;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="mt-8 space-y-3">
      <header className="flex items-baseline justify-between border-b border-border pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Imported · {project.mediaBin.length}
        </p>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {project.mediaBin.map((m) => (
          <BinTile key={m.id} item={m} onRemove={() => onRemove(m.id)} />
        ))}
      </ul>
    </section>
  );
}

function BinTile({
  item,
  onRemove,
}: {
  item: MediaBinItem;
  onRemove: () => void;
}) {
  return (
    <li className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
        style={{
          background: `linear-gradient(135deg, ${item.color}25, ${item.color}05)`,
          border: `1px solid ${item.color}55`,
        }}
      >
        <span
          className="font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
          style={{ color: item.color }}
        >
          {item.kind === "video" ? "VID" : "AUD"}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">
          {item.label}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {formatDuration(item.durationSec)}
          <span className="px-1.5 text-border-strong">·</span>
          {formatBytes(item.fileSize)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove"
        className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted/70 opacity-0 transition-all hover:text-error group-hover:opacity-100"
      >
        Remove
      </button>
    </li>
  );
}

function ImportFooter({
  project,
  canContinue,
  syncEnabled,
  onCancel,
  onContinue,
}: {
  project: PodcastProject;
  canContinue: boolean;
  syncEnabled: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <footer className="flex h-14 shrink-0 items-center gap-4 border-t border-border bg-surface px-6">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-error/40 hover:text-error"
      >
        Discard
      </button>
      <p className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {project.mediaBin.length === 0
          ? "Awaiting first source"
          : canContinue
            ? syncEnabled
              ? "Multi-source · auto-sync ready"
              : "Single source · sync skipped"
            : "Add at least one video"}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Step 1 of 2
        </span>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          Continue to editor →
        </button>
      </div>
    </footer>
  );
}

function ProjectMissing() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-32 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Project not found
      </p>
      <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
        This project doesn&apos;t exist or was discarded.
      </h1>
      <Link
        href="/podcast"
        className="rounded-md border border-border bg-surface-2 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong"
      >
        Back to studio
      </Link>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
      {children}
    </span>
  );
}

function Step({
  n,
  title,
  hint,
}: {
  n: string;
  title: string;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-px font-mono text-[10px] tabular-nums uppercase tracking-[0.18em] text-muted">
        {n}
      </span>
      <div>
        <p className="text-[12px] font-medium text-foreground">{title}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {hint}
        </p>
      </div>
    </li>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={highlight ? "text-foreground" : "text-muted"}>{value}</dd>
    </div>
  );
}

function DropGlyph({ hovering }: { hovering: boolean }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      aria-hidden
      className={hovering ? "text-accent" : "text-muted"}
    >
      <rect
        x="6"
        y="14"
        width="36"
        height="24"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeDasharray="3 2"
      />
      <path
        d="M24 8V26M24 8L18 14M24 8L30 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
