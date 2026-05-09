"use client";

import { ImportSlotCard } from "@/components/podcast/import-slot-card";
import { MEDIA_SLOTS } from "@/lib/podcast/pipeline";
import {
  removeProject,
  updateProjectTitle,
} from "@/lib/podcast/services";
import { useProject } from "@/lib/podcast/use-podcast";
import type { PodcastProject } from "@/lib/podcast/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Import Studio.
 *
 * Four canonical source slots. Video 1 is required to continue; everything
 * else is optional. Each card runs its own upload pipeline (XHR with
 * progress → server probes + thumbnails → bin item commit), so users can
 * fill slots in parallel.
 *
 * The Sync stage downstream is auto-skipped on single-source projects and
 * auto-pending when multiple sources are present.
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
        <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-12">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
                  Step 1 · Import
                </p>
                <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-tight text-foreground sm:text-[34px]">
                  Bring your raw media in.
                </h1>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">
                  Drop into the four canonical source slots. Only Video 1 is
                  required — everything else (second camera, host mic, guest
                  mic) is optional.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {MEDIA_SLOTS.map((slot) => (
                  <ImportSlotCard
                    key={slot.slot}
                    project={project}
                    slotMeta={{
                      slot: slot.slot,
                      label: slot.label,
                      shortLabel: slot.shortLabel,
                      trackType: slot.trackType,
                      accept: slot.accept,
                      hint: slot.hint,
                      required: slot.required,
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Hint highlight={hasVideo}>1 video minimum</Hint>
                <Hint highlight={videoCount >= 2}>
                  2 cameras unlocks multicam
                </Hint>
                <Hint highlight={syncEnabled}>2+ sources unlock auto-sync</Hint>
              </div>
            </section>

            <ImportSidebar
              videoCount={videoCount}
              audioCount={audioCount}
              syncEnabled={syncEnabled}
            />
          </div>
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
    <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Session
        </p>
        <dl className="space-y-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <Row
            label="Video sources"
            value={String(videoCount)}
            highlight={videoCount > 0}
          />
          <Row
            label="Audio sources"
            value={String(audioCount)}
            highlight={audioCount > 0}
          />
          <Row
            label="Sync stage"
            value={syncEnabled ? "Available" : "Skipped"}
            highlight={syncEnabled}
          />
        </dl>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Pipeline
        </p>
        <ol className="space-y-2 text-[12px] text-muted">
          <Step n="01" title="Import" hint="You are here" active />
          <Step
            n="02"
            title="Sync"
            hint={syncEnabled ? "Multi-source aligned" : "Auto-skipped"}
          />
          <Step n="03" title="Editor" hint="Multi-track timeline" />
          <Step n="04" title="Audio Export" hint="Clean MP3 master" />
          <Step n="05" title="Viral Clips" hint="Mark in / out → 9:16" />
          <Step n="06" title="Distribution" hint="Stage every output" />
        </ol>
      </div>
    </aside>
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
          Step 1 of 6
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

function Hint({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
        highlight
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-surface-2 text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function Step({
  n,
  title,
  hint,
  active,
}: {
  n: string;
  title: string;
  hint: string;
  active?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-px font-mono text-[10px] tabular-nums uppercase tracking-[0.18em] ${
          active ? "text-accent" : "text-muted"
        }`}
      >
        {n}
      </span>
      <div>
        <p
          className={`text-[12px] font-medium ${
            active ? "text-foreground" : "text-foreground/80"
          }`}
        >
          {title}
        </p>
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
