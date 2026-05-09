"use client";

import {
  computeContentDuration,
  formatPlayheadTime,
  pxToTime,
  rulerTicks,
  timeToPx,
} from "@/lib/editor/timeline-math";
import {
  useEditorDoc,
  useEditorSnap,
  useEditorStore,
} from "@/lib/editor/use-editor";
import type { PodcastProject } from "@/lib/podcast/types";
import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineTrack } from "./timeline-track";
import { TimelineToolbar } from "./timeline-toolbar";
import { TimelinePlayhead } from "./timeline-playhead";
import { TimelineMarks } from "./timeline-marks";

/**
 * Timeline — full-width footer panel of the editor.
 *
 * Layout:
 *   [ Toolbar (zoom, snap, mark in/out hints)                           ]
 *   [ Track headers ▏ ───── Ruler ───────────────────────────────────── ]
 *   [             ▏  ──── Tracks (clips) ────────────────────────────── ]
 *
 * Coordinate system:
 *   x = (time - 0) * zoom + headerWidth
 *
 * Pointer events on the ruler set the playhead; pointer events on clips
 * are owned by the clip components which call back into the store.
 */

const TRACK_HEADER_WIDTH = 168;
const RULER_HEIGHT = 28;
const TIMELINE_HORIZONTAL_PAD = 32;

export function Timeline({ project }: { project: PodcastProject }) {
  const doc = useEditorDoc();
  const store = useEditorStore();
  const snap = useEditorSnap();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort tracks top-down by order.
  const tracks = useMemo(
    () => [...doc.tracks].sort((a, b) => a.order - b.order),
    [doc.tracks],
  );

  const contentDuration = computeContentDuration(doc);
  const totalWidth =
    timeToPx(contentDuration, doc.zoom) + TIMELINE_HORIZONTAL_PAD * 2;

  // Drag-from-bin support: dropping a media item creates a clip on the
  // appropriate track at the drop time.
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const id = e.dataTransfer.getData("application/x-vcos-media");
    if (!id) return;
    const item = project.mediaBin.find((m) => m.id === id);
    if (!item) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scroll = scrollRef.current?.scrollLeft ?? 0;
    const x = e.clientX - rect.left + scroll - TIMELINE_HORIZONTAL_PAD;
    const t = Math.max(0, pxToTime(x, doc.zoom));
    store.addClipFromBin(item, t);
  }

  function onRulerPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const ruler = e.currentTarget;
    ruler.setPointerCapture(e.pointerId);
    const rect = ruler.getBoundingClientRect();
    const scroll = scrollRef.current?.scrollLeft ?? 0;
    const update = (clientX: number) => {
      const x = clientX - rect.left + scroll - TIMELINE_HORIZONTAL_PAD;
      const t = Math.max(0, pxToTime(x, doc.zoom));
      store.setPlayhead(t);
    };
    update(e.clientX);
    function move(ev: PointerEvent<Element> | globalThis.PointerEvent) {
      update((ev as globalThis.PointerEvent).clientX);
    }
    function up(ev: globalThis.PointerEvent) {
      ruler.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", move as EventListener);
      window.removeEventListener("pointerup", up);
      void ev;
    }
    window.addEventListener("pointermove", move as EventListener);
    window.addEventListener("pointerup", up);
  }

  // Keyboard shortcuts global to the editor.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        store.splitAtPlayhead();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        store.markInAtPlayhead();
      } else if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        store.markOutAtPlayhead();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        store.toggleSnap();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (doc.selection.length > 0) {
          e.preventDefault();
          store.deleteSelection();
        }
      } else if (e.key === "Escape") {
        store.clearSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, doc.selection.length]);

  return (
    <section className="flex h-[320px] flex-col border-t border-border bg-surface">
      <TimelineToolbar />

      <div
        className="relative flex min-h-0 flex-1 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) store.clearSelection();
        }}
      >
        {/* Track headers */}
        <div
          className="z-20 shrink-0 border-r border-border bg-surface-2/40"
          style={{ width: TRACK_HEADER_WIDTH }}
        >
          <div
            className="border-b border-border"
            style={{ height: RULER_HEIGHT }}
          />
          {tracks.map((track) => (
            <TrackHeader key={track.id} track={track} />
          ))}
        </div>

        {/* Scrollable timeline body */}
        <div
          ref={scrollRef}
          className="relative min-w-0 flex-1 overflow-x-auto overflow-y-auto"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/x-vcos-media")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={onDrop}
        >
          <div
            className="relative"
            style={{ width: totalWidth }}
          >
            {/* Ruler */}
            <div
              className="sticky top-0 z-10 cursor-col-resize select-none border-b border-border bg-surface"
              style={{ height: RULER_HEIGHT }}
              onPointerDown={onRulerPointerDown}
            >
              <div
                className="relative h-full"
                style={{
                  paddingLeft: TIMELINE_HORIZONTAL_PAD,
                  paddingRight: TIMELINE_HORIZONTAL_PAD,
                }}
              >
                <TimelineRuler
                  ticks={rulerTicks(doc.zoom, 0, contentDuration + 5)}
                  zoom={doc.zoom}
                />
              </div>
            </div>

            {/* Track lanes */}
            <div
              className="relative"
              style={{
                paddingLeft: TIMELINE_HORIZONTAL_PAD,
                paddingRight: TIMELINE_HORIZONTAL_PAD,
              }}
            >
              {tracks.map((track) => (
                <TimelineTrack
                  key={track.id}
                  track={track}
                  doc={doc}
                  project={project}
                />
              ))}
            </div>

            {/* Mark in/out + viral clip ranges */}
            <TimelineMarks
              doc={doc}
              left={TIMELINE_HORIZONTAL_PAD}
              top={RULER_HEIGHT}
            />

            {/* Playhead */}
            <TimelinePlayhead
              time={doc.playhead}
              zoom={doc.zoom}
              left={TIMELINE_HORIZONTAL_PAD}
              top={0}
            />

            {/* Snap guide */}
            {snap && (
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-accent/70"
                style={{
                  left:
                    TIMELINE_HORIZONTAL_PAD + timeToPx(snap.time, doc.zoom),
                }}
              >
                <div className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-accent" />
              </div>
            )}
          </div>
        </div>
      </div>

      <PlayheadReadout time={doc.playhead} duration={doc.duration} />
    </section>
  );
}

function PlayheadReadout({
  time,
  duration,
}: {
  time: number;
  duration: number;
}) {
  return (
    <div className="flex h-7 items-center justify-between border-t border-border bg-surface-2/40 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
      <span>
        Playhead
        <span className="ml-2 text-foreground">
          {formatPlayheadTime(time)}
        </span>
      </span>
      <span>
        Duration
        <span className="ml-2 text-foreground">
          {formatPlayheadTime(duration)}
        </span>
      </span>
    </div>
  );
}

import type { Track } from "@/lib/editor/types";

function TrackHeader({ track }: { track: Track }) {
  const store = useEditorStore();
  return (
    <div
      className="flex items-center justify-between gap-2 border-b border-border px-3"
      style={{ height: track.height }}
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-foreground">
          {track.name}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          {track.kind}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {track.kind !== "marker" && track.kind !== "caption" && (
          <>
            <TinyToggle
              active={track.muted}
              label="M"
              tone="error"
              onClick={() => store.setTrackMuted(track.id, !track.muted)}
              title="Mute"
            />
            <TinyToggle
              active={track.solo}
              label="S"
              tone="warning"
              onClick={() => store.setTrackSolo(track.id, !track.solo)}
              title="Solo"
            />
          </>
        )}
      </div>
    </div>
  );
}

function TinyToggle({
  active,
  label,
  tone,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  tone: "error" | "warning";
  onClick: () => void;
  title: string;
}) {
  const activeClass =
    tone === "error"
      ? "border-error/50 bg-error/10 text-error"
      : "border-warning/50 bg-warning/10 text-warning";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-5 w-5 items-center justify-center rounded border font-mono text-[9px] font-medium uppercase transition-colors ${
        active
          ? activeClass
          : "border-border bg-surface-2 text-muted hover:border-border-strong hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
