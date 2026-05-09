"use client";

import { pxToTime, timeToPx } from "@/lib/editor/timeline-math";
import { useEditorStore } from "@/lib/editor/use-editor";
import type {
  EditorClip,
  MediaBinItem,
  OverlayClip,
  Track,
} from "@/lib/editor/types";
import {
  type PointerEvent as ReactPointerEvent,
  useRef,
} from "react";
import { WaveformView } from "../waveform-view";

/**
 * TimelineClip — interactive clip block.
 *
 * Pointer interactions (mouse / pen / touch unified via Pointer Events):
 *   - body drag    → move (calls store.moveClip)
 *   - left handle  → trim from left
 *   - right handle → trim from right
 *
 * Snapping is computed inside the store, the clip just streams pointer
 * deltas. Selection toggles on pointerdown; double-click splits at
 * the playhead position relative to this clip.
 */

const HANDLE_WIDTH = 8;

export function TimelineClip({
  clip,
  track,
  zoom,
  selected,
  mediaBin,
  projectId,
}: {
  clip: EditorClip;
  track: Track;
  zoom: number;
  selected: boolean;
  mediaBin: MediaBinItem[];
  projectId: string;
}) {
  const store = useEditorStore();
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "move" | "trim-left" | "trim-right";
    startX: number;
    startStart: number;
    startEnd: number;
  } | null>(null);

  const left = timeToPx(clip.start, zoom);
  const width = Math.max(4, timeToPx(clip.duration, zoom));

  const media =
    clip.kind === "video" || clip.kind === "audio"
      ? mediaBin.find((m) => m.id === clip.mediaId) ?? null
      : null;
  const tint = media?.color ?? clipDefaultColor(clip);

  function start(
    e: ReactPointerEvent<HTMLElement>,
    mode: "move" | "trim-left" | "trim-right",
  ) {
    if (track.locked) return;
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const additive = e.shiftKey || e.metaKey;
    if (!selected) store.toggleClipSelection(clip.id, additive);

    dragRef.current = {
      mode,
      startX: e.clientX,
      startStart: clip.start,
      startEnd: clip.start + clip.duration,
    };

    function move(ev: globalThis.PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = ev.clientX - drag.startX;
      const dt = pxToTime(dx, zoom);
      if (drag.mode === "move") {
        store.moveClip(clip.id, dt - (clip.start - drag.startStart), false);
      } else if (drag.mode === "trim-left") {
        store.trimClip(clip.id, "left", drag.startStart + dt, false);
      } else {
        store.trimClip(clip.id, "right", drag.startEnd + dt, false);
      }
    }
    function up(ev: globalThis.PointerEvent) {
      const drag = dragRef.current;
      if (drag) {
        const dx = ev.clientX - drag.startX;
        const dt = pxToTime(dx, zoom);
        if (drag.mode === "move") {
          store.moveClip(clip.id, dt - (clip.start - drag.startStart), true);
        } else if (drag.mode === "trim-left") {
          store.trimClip(clip.id, "left", drag.startStart + dt, true);
        } else {
          store.trimClip(clip.id, "right", drag.startEnd + dt, true);
        }
      }
      dragRef.current = null;
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function handleContext(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onPointerDown={(e) => start(e, "move")}
      onContextMenu={handleContext}
      className={`group absolute top-1 cursor-grab overflow-hidden rounded-md border transition-shadow active:cursor-grabbing ${
        selected
          ? "border-foreground/60 ring-1 ring-foreground/30"
          : "border-black/40"
      }`}
      style={{
        left,
        width,
        height: track.height - 8,
        background: clipBackground(tint),
        boxShadow: selected
          ? "0 6px 24px -10px rgba(0,0,0,0.7)"
          : "0 1px 0 rgba(0,0,0,0.4)",
      }}
    >
      {/* Inner gradient + subtle texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-90"
        style={{ background: clipBackground(tint) }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_55%)]"
      />

      {/* Left trim handle */}
      <div
        onPointerDown={(e) => start(e, "trim-left")}
        className="absolute left-0 top-0 z-10 h-full cursor-ew-resize"
        style={{ width: HANDLE_WIDTH }}
      >
        <div className="absolute inset-y-1 left-1 w-px bg-white/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Right trim handle */}
      <div
        onPointerDown={(e) => start(e, "trim-right")}
        className="absolute right-0 top-0 z-10 h-full cursor-ew-resize"
        style={{ width: HANDLE_WIDTH }}
      >
        <div className="absolute inset-y-1 right-1 w-px bg-white/30 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Body content */}
      <div className="relative z-[1] flex h-full items-center gap-2 px-2.5">
        <ClipGlyph clip={clip} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium leading-tight text-white/95">
            {clipDisplayName(clip, media)}
          </p>
          {track.kind === "audio" &&
            (media && media.waveformReady ? (
              <WaveformView
                projectId={projectId}
                item={media}
                width={Math.max(0, width - 28)}
                height={Math.max(0, track.height - 22)}
                inPoint={clip.kind === "audio" ? clip.inPoint : 0}
                duration={clip.duration}
                color="rgba(255,255,255,0.85)"
              />
            ) : (
              <Waveform
                color={tint}
                width={width - 28}
                height={track.height - 22}
              />
            ))}
          {track.kind === "video" &&
            media &&
            media.waveformReady &&
            track.height >= 56 && (
              <WaveformView
                projectId={projectId}
                item={media}
                width={Math.max(0, width - 28)}
                height={Math.max(0, Math.min(20, track.height - 32))}
                inPoint={clip.kind === "video" ? clip.inPoint : 0}
                duration={clip.duration}
                color="rgba(255,255,255,0.55)"
              />
            )}
        </div>
      </div>
    </div>
  );
}

function clipDisplayName(
  clip: EditorClip,
  media: MediaBinItem | null,
): string {
  if (clip.label) return clip.label;
  if (clip.kind === "overlay") {
    return (clip as OverlayClip).text || overlayLabel(clip as OverlayClip);
  }
  if (clip.kind === "caption") return clip.text;
  return media?.label ?? "Clip";
}

function overlayLabel(c: OverlayClip): string {
  switch (c.overlayKind) {
    case "lower_third":
      return "Lower third";
    case "sponsor_card":
      return "Sponsor";
    case "subscribe_cta":
      return "Subscribe";
    case "title_card":
      return "Title";
  }
}

function clipBackground(tint: string): string {
  return `linear-gradient(135deg, ${tint}cc, ${tint}66)`;
}

function clipDefaultColor(clip: EditorClip): string {
  if (clip.kind === "overlay") return "#f43f5e";
  if (clip.kind === "caption") return "#facc15";
  return "#6366f1";
}

function ClipGlyph({ clip }: { clip: EditorClip }) {
  const stroke = "rgba(255,255,255,0.85)";
  if (clip.kind === "video") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
        <rect
          x="1"
          y="2.5"
          width="8"
          height="7"
          rx="1.2"
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M9 6L11.5 5V7L9 6Z"
          fill={stroke}
        />
      </svg>
    );
  }
  if (clip.kind === "audio") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
        <rect
          x="4.5"
          y="1.5"
          width="3"
          height="6"
          rx="1.5"
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M2.5 6.5C2.5 8.43 4.07 10 6 10C7.93 10 9.5 8.43 9.5 6.5"
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
    );
  }
  if (clip.kind === "overlay") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
        <rect
          x="1.5"
          y="1.5"
          width="9"
          height="9"
          rx="1"
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
        />
        <line
          x1="3"
          y1="9"
          x2="9"
          y2="9"
          stroke={stroke}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // caption
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
      <rect
        x="1.5"
        y="3"
        width="9"
        height="6"
        rx="1"
        stroke={stroke}
        strokeWidth="1.2"
        fill="none"
      />
      <line
        x1="3.5"
        y1="6"
        x2="6"
        y2="6"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="6"
        x2="9"
        y2="6"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Decorative waveform — deterministic from clip width so it stays stable
 * during interaction. Real PCM analysis is a future integration.
 */
function Waveform({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  if (width < 30 || height < 8) return null;
  const bars = Math.max(8, Math.floor(width / 3));
  const data = waveformData(bars);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${bars} 10`}
      preserveAspectRatio="none"
      aria-hidden
      className="opacity-80"
    >
      {data.map((v, i) => (
        <rect
          key={i}
          x={i + 0.2}
          y={5 - v / 2}
          width={0.6}
          height={v}
          fill={color}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

function waveformData(n: number): number[] {
  // Deterministic-pseudo-random with mild peaks; doesn't depend on time.
  const out: number[] = [];
  let x = 13;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    const v = 1.5 + 6 * Math.abs(Math.sin(i * 0.4) * 0.7 + r * 0.6);
    out.push(Math.min(9.5, v));
  }
  return out;
}
