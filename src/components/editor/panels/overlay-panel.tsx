"use client";

import { useEditorStore } from "@/lib/editor/use-editor";
import type { OverlayKind } from "@/lib/editor/types";
import { useState } from "react";

/**
 * Overlay panel — adds lower thirds, sponsor cards, subscribe CTAs, and
 * title cards to the overlay track at the playhead.
 *
 * Each overlay kind has presets for typical podcast use; clicking inserts
 * a clip with default text the user can edit in the inspector.
 */

interface OverlayPreset {
  kind: OverlayKind;
  title: string;
  body: string;
  text: string;
  subtext?: string;
}

const PRESETS: OverlayPreset[] = [
  {
    kind: "lower_third",
    title: "Lower third",
    body: "Name + role over the bottom-left corner.",
    text: "Jordan Lee",
    subtext: "Co-founder · Plywood Studios",
  },
  {
    kind: "sponsor_card",
    title: "Sponsor card",
    body: "Highlight a sponsor read with a marker pin on the timeline.",
    text: "Brilliant.org",
    subtext: "Sponsored segment",
  },
  {
    kind: "subscribe_cta",
    title: "Subscribe CTA",
    body: "Bottom-right callout to drive subscriptions.",
    text: "Subscribe",
  },
  {
    kind: "title_card",
    title: "Title card",
    body: "Centered card for opening titles or chapter cards.",
    text: "Episode 47",
    subtext: "The Future of Open Source",
  },
];

export function OverlayPanel() {
  const store = useEditorStore();
  const [busyKind, setBusyKind] = useState<OverlayKind | null>(null);

  function add(p: OverlayPreset) {
    setBusyKind(p.kind);
    store.addOverlay(p.kind, p.text, p.subtext);
    setTimeout(() => setBusyKind(null), 220);
  }

  return (
    <div className="space-y-2 p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
        Templates
      </p>
      <ul className="space-y-1.5">
        {PRESETS.map((p) => (
          <li key={p.kind}>
            <button
              type="button"
              onClick={() => add(p)}
              className={`group block w-full rounded-lg border border-border bg-surface p-3 text-left transition-all hover:border-border-strong hover:bg-surface-2/60 ${
                busyKind === p.kind ? "ring-1 ring-accent" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <OverlayGlyph kind={p.kind} />
                <p className="text-[12px] font-medium text-foreground">
                  {p.title}
                </p>
                <span className="ml-auto rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted opacity-60 transition-opacity group-hover:opacity-100">
                  + Insert
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {p.body}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
        Hint
      </p>
      <p className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
        Overlays land on the Overlay track at the current playhead. Sponsor
        and subscribe overlays also pin a marker for the production tracker.
      </p>
    </div>
  );
}

function OverlayGlyph({ kind }: { kind: OverlayKind }) {
  if (kind === "lower_third") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded bg-accent-subtle">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <rect
            x="1.5"
            y="6.5"
            width="9"
            height="3"
            rx="0.5"
            className="fill-accent"
          />
        </svg>
      </span>
    );
  }
  if (kind === "sponsor_card") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded bg-warning/10">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <rect
            x="6"
            y="2"
            width="4"
            height="3"
            rx="0.5"
            className="fill-warning"
          />
          <rect
            x="2"
            y="6"
            width="8"
            height="4"
            rx="0.5"
            stroke="currentColor"
            className="fill-none stroke-warning"
            strokeWidth="1"
          />
        </svg>
      </span>
    );
  }
  if (kind === "subscribe_cta") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded bg-accent-subtle">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <circle
            cx="6"
            cy="6"
            r="3.5"
            className="fill-accent"
          />
          <path
            d="M5 4.5V7.5L7 6L5 4.5Z"
            className="fill-white"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded bg-surface-2">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <rect
          x="2"
          y="3.5"
          width="8"
          height="5"
          rx="0.5"
          stroke="currentColor"
          className="fill-none stroke-foreground/60"
          strokeWidth="1"
        />
        <line
          x1="3.5"
          y1="6"
          x2="8.5"
          y2="6"
          stroke="currentColor"
          className="stroke-foreground/60"
          strokeWidth="1"
        />
      </svg>
    </span>
  );
}
