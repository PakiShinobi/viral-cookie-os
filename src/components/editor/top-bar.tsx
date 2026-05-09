"use client";

import { useEditorDoc, useEditorStore } from "@/lib/editor/use-editor";
import { formatPlayheadTime } from "@/lib/editor/timeline-math";
import { updateProjectTitle } from "@/lib/podcast/services";
import type { PodcastProject } from "@/lib/podcast/types";
import { projectShortCode } from "@/lib/podcast/format";
import Link from "next/link";
import { useState } from "react";

/**
 * TopBar — back link, project title (editable), aspect toggle, transport
 * controls, snap toggle, export shortcut, project meta.
 *
 * Layout is dense and operational: minimal vertical space, monospace for
 * timecodes, clear visual separation between transport and project chrome.
 */

export function TopBar({ project }: { project: PodcastProject }) {
  const doc = useEditorDoc();
  const store = useEditorStore();
  const [title, setTitle] = useState(project.title);
  const [editing, setEditing] = useState(false);

  function commitTitle() {
    setEditing(false);
    if (title.trim() && title.trim() !== project.title) {
      updateProjectTitle(project.id, title);
    } else {
      setTitle(project.title);
    }
  }

  return (
    <header className="relative z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
      {/* Brand + back */}
      <div className="flex items-center gap-3">
        <Link
          href="/podcast"
          aria-label="Back to studio"
          className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-1.5 transition-colors hover:border-border-strong"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-accent text-[9px] font-bold text-white">
            VC
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Studio
          </span>
        </Link>
        <span className="hidden text-border-strong md:inline">/</span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted md:inline">
          {projectShortCode(project.id)}
        </span>
      </div>

      {/* Title */}
      <div className="min-w-0 flex-1 px-2">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitle(project.title);
                setEditing(false);
              }
            }}
            className="w-full max-w-md rounded-md border border-border bg-surface-2 px-2 py-1 text-[14px] font-medium text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="max-w-md truncate rounded-md px-2 py-1 text-left text-[14px] font-medium text-foreground transition-colors hover:bg-surface-2"
            title="Rename project"
          >
            {project.title}
          </button>
        )}
      </div>

      {/* Transport */}
      <div className="hidden items-center gap-1 rounded-lg border border-border bg-surface-2 px-1.5 py-1 md:flex">
        <TransportButton
          label="Mark in"
          shortcut="I"
          onClick={() => store.markInAtPlayhead()}
          icon={<MarkInIcon />}
        />
        <TransportButton
          label="Split"
          shortcut="S"
          onClick={() => store.splitAtPlayhead()}
          icon={<SplitIcon />}
        />
        <TransportButton
          label="Mark out"
          shortcut="O"
          onClick={() => store.markOutAtPlayhead()}
          icon={<MarkOutIcon />}
        />
        <span className="mx-2 h-5 w-px bg-border" />
        <span className="font-mono text-[12px] tabular-nums text-foreground">
          {formatPlayheadTime(doc.playhead)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          / {formatPlayheadTime(doc.duration)}
        </span>
      </div>

      {/* Aspect toggle */}
      <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5">
        <AspectButton
          label="16:9"
          active={doc.aspect === "16:9"}
          onClick={() => store.setAspect("16:9")}
        />
        <AspectButton
          label="9:16"
          active={doc.aspect === "9:16"}
          onClick={() => store.setAspect("9:16")}
        />
      </div>

      {/* Snap toggle */}
      <button
        type="button"
        onClick={() => store.toggleSnap()}
        className={`rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
          doc.snapEnabled
            ? "border-accent/50 bg-accent-subtle text-accent"
            : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
        }`}
        title="Toggle snap (N)"
      >
        Snap
      </button>

      {/* Pipeline link (production tracker) */}
      <Link
        href={`/podcast/${project.id}/pipeline`}
        className="rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:border-border-strong hover:text-foreground"
        title="Open production pipeline"
      >
        Pipeline
      </Link>

      {/* Export */}
      <button
        type="button"
        className="rounded-md bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Export
      </button>
    </header>
  );
}

function TransportButton({
  label,
  shortcut,
  onClick,
  icon,
}: {
  label: string;
  shortcut: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (${shortcut})`}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      {icon}
    </button>
  );
}

function AspectButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? "bg-accent-subtle text-accent"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

const MarkInIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
    <path
      d="M3 2V10L8 6L3 2Z"
      fill="currentColor"
    />
    <line
      x1="9.5"
      y1="2"
      x2="9.5"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const MarkOutIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
    <line
      x1="2.5"
      y1="2"
      x2="2.5"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path d="M9 2V10L4 6L9 2Z" fill="currentColor" />
  </svg>
);

const SplitIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
    <line
      x1="6"
      y1="1.5"
      x2="6"
      y2="10.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeDasharray="2 1.5"
    />
    <rect
      x="1.5"
      y="4"
      width="3"
      height="4"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <rect
      x="7.5"
      y="4"
      width="3"
      height="4"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
  </svg>
);
