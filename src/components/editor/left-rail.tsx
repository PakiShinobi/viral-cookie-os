"use client";

import { useState } from "react";
import { MediaBinPanel } from "./panels/media-bin-panel";
import { OverlayPanel } from "./panels/overlay-panel";
import { CaptionPanel } from "./panels/caption-panel";
import { ExportPanel } from "./panels/export-panel";
import type { PodcastProject } from "@/lib/podcast/types";

/**
 * LeftRail — primary editor sidebar with four tabbed panels:
 *   Media · Overlays · Captions · Exports.
 *
 * The tabs are vertical icon strips on the far left so the wide content
 * area is unbroken. Familiar to CapCut / Frame.io users.
 */

type TabId = "media" | "overlays" | "captions" | "exports";

const TABS: Array<{
  id: TabId;
  label: string;
  hint: string;
  Icon: () => React.JSX.Element;
}> = [
  { id: "media", label: "Media", hint: "Imported sources", Icon: MediaIcon },
  {
    id: "overlays",
    label: "Overlays",
    hint: "Lower thirds, sponsors, CTA",
    Icon: OverlaysIcon,
  },
  {
    id: "captions",
    label: "Captions",
    hint: "Burned subtitle blocks",
    Icon: CaptionsIcon,
  },
  {
    id: "exports",
    label: "Exports",
    hint: "Presets and viral clips",
    Icon: ExportsIcon,
  },
];

export function LeftRail({ project }: { project: PodcastProject }) {
  const [tab, setTab] = useState<TabId>("media");
  return (
    <aside className="flex w-[320px] shrink-0 border-r border-border bg-surface">
      {/* Vertical tab strip */}
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface-2/40 py-3">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              title={`${t.label} — ${t.hint}`}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                active
                  ? "bg-accent-subtle text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              <t.Icon />
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Panel content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
            {TABS.find((t) => t.id === tab)?.hint}
          </p>
          <h2 className="mt-1 text-[14px] font-semibold tracking-tight text-foreground">
            {TABS.find((t) => t.id === tab)?.label}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto">
          {tab === "media" && <MediaBinPanel project={project} />}
          {tab === "overlays" && <OverlayPanel />}
          {tab === "captions" && <CaptionPanel />}
          {tab === "exports" && <ExportPanel project={project} />}
        </div>
      </div>
    </aside>
  );
}

/* ------- Icons ------- */

function MediaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3.5"
        width="9"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M11 7L14 5.5V9.5L11 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OverlaysIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="2"
        width="9"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <rect
        x="5"
        y="5"
        width="9"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="var(--color-surface-2)"
      />
    </svg>
  );
}

function CaptionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="1.5"
        y="3"
        width="13"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line
        x1="4"
        y1="9.5"
        x2="7"
        y2="9.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="9.5"
        x2="12"
        y2="9.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5V10M8 1.5L4.5 5M8 1.5L11.5 5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 11V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
