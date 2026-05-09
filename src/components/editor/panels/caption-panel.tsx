"use client";

import { makeCaptionClip } from "@/lib/editor/factories";
import { useEditorDoc, useEditorStore } from "@/lib/editor/use-editor";
import { formatPlayheadTime } from "@/lib/editor/timeline-math";
import { useState } from "react";

/**
 * Caption panel — manual caption block authoring.
 *
 * Auto-transcription is the future integration; for now the user types a
 * caption block, picks a duration, and presses "Add at playhead". The
 * inserted clip lives on the Caption track and renders during canvas
 * playback (future: subtitle overlay).
 */

export function CaptionPanel() {
  const doc = useEditorDoc();
  const store = useEditorStore();
  const [text, setText] = useState("");
  const [duration, setDuration] = useState(3);

  const captionTrack = doc.tracks.find((t) => t.kind === "caption");
  const captionClips = doc.clips
    .filter((c) => c.kind === "caption")
    .sort((a, b) => a.start - b.start);

  function add() {
    if (!captionTrack || !text.trim()) return;
    const clip = makeCaptionClip({
      trackId: captionTrack.id,
      start: doc.playhead,
      duration,
      text: text.trim(),
    });
    store.addClip(clip);
    setText("");
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="rounded-lg border border-border bg-surface p-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          New caption · at {formatPlayheadTime(doc.playhead)}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Type a caption block…"
          className="mt-2 block w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-foreground placeholder:text-muted/70 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <div className="mt-2 flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Duration
          </label>
          <input
            type="number"
            min={0.5}
            max={20}
            step={0.5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 1)}
            className="w-16 rounded-md border border-border bg-surface-2 px-2 py-1 text-center font-mono text-[12px] tabular-nums text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            sec
          </span>
          <button
            type="button"
            onClick={add}
            disabled={!text.trim()}
            className="ml-auto rounded-md bg-accent px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            Add at playhead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          Caption blocks · {captionClips.length}
        </p>
        {captionClips.length === 0 ? (
          <p className="mt-2 rounded-lg border border-border bg-surface-2/40 px-3 py-4 text-center text-[12px] text-muted">
            No captions yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {captionClips.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="font-mono text-[10px] tabular-nums text-muted">
                  {formatPlayheadTime(c.start)}
                </span>
                <p className="flex-1 text-[12px] leading-snug text-foreground/90">
                  {c.kind === "caption" ? c.text : ""}
                </p>
                <button
                  type="button"
                  onClick={() => store.deleteClip(c.id)}
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted/70 transition-colors hover:text-error"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
