"use client";

import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
} from "@/lib/editor/timeline-math";
import { useEditorDoc, useEditorStore } from "@/lib/editor/use-editor";

/**
 * TimelineToolbar — zoom slider, snap toggle, hotkey hint strip.
 */
export function TimelineToolbar() {
  const doc = useEditorDoc();
  const store = useEditorStore();
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-surface-2/30 px-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
        Timeline
      </p>

      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          Zoom
        </span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={doc.zoom}
          onChange={(e) => store.setZoom(Number(e.target.value))}
          className="h-1 w-32 accent-accent"
        />
        <span className="font-mono text-[10px] tabular-nums text-foreground">
          {doc.zoom}px/s
        </span>
        <button
          type="button"
          onClick={() => store.setZoom(DEFAULT_ZOOM)}
          className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          Reset
        </button>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Hint k="S">Split</Hint>
        <Hint k="I">In</Hint>
        <Hint k="O">Out</Hint>
        <Hint k="N">Snap</Hint>
        <Hint k="⌫">Delete</Hint>
      </div>
    </div>
  );
}

function Hint({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted/70">
      <span className="rounded border border-border bg-surface-2 px-1 py-px text-[9px] font-medium text-muted">
        {k}
      </span>
      {children}
    </span>
  );
}
