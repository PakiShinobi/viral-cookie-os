"use client";

import {
  useEditorDoc,
  useEditorPlayback,
} from "@/lib/editor/use-editor";
import { formatPlayheadTime } from "@/lib/editor/timeline-math";
import type {
  EditorDoc,
  MediaBinItem,
  OverlayClip,
  VideoClip,
} from "@/lib/editor/types";
import type { PodcastProject } from "@/lib/podcast/types";
import { useEffect, useRef, useState } from "react";

/**
 * PreviewCanvas — center stage of the editor.
 *
 * Renders the active video frame at the playhead. We deliberately do not
 * implement a real rendering engine here: the canvas is a representational
 * preview built from React + DOM. The active video clip can play through a
 * native <video> element when a fresh blob URL is available; otherwise the
 * canvas shows a calm static frame with the clip metadata.
 *
 * Overlay clips render as positioned DOM nodes on top of the video, with
 * transforms applied (x/y/scale/crop). Safe-zone guides outline the
 * title-safe and action-safe areas to help framing.
 */

const FRAME_PADDING = 32;

export function PreviewCanvas({ project }: { project: PodcastProject }) {
  const doc = useEditorDoc();
  const aspect = doc.aspect;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);

  // Compute the largest centered frame that fits the wrapper.
  useEffect(() => {
    function fit() {
      const el = wrapperRef.current;
      if (!el) return;
      const w = el.clientWidth - FRAME_PADDING * 2;
      const h = el.clientHeight - FRAME_PADDING * 2;
      if (w <= 0 || h <= 0) return;
      const ratio = aspect === "16:9" ? 16 / 9 : 9 / 16;
      let frameW = w;
      let frameH = w / ratio;
      if (frameH > h) {
        frameH = h;
        frameW = h * ratio;
      }
      setFrame({ w: Math.round(frameW), h: Math.round(frameH) });
    }
    fit();
    const obs = new ResizeObserver(fit);
    if (wrapperRef.current) obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, [aspect]);

  const activeVideo = pickActiveVideoClip(doc);
  const activeOverlays = pickActiveOverlayClips(doc);
  const media = activeVideo
    ? project.mediaBin.find((m) => m.id === activeVideo.mediaId)
    : null;

  return (
    <div
      ref={wrapperRef}
      className="bg-grain relative flex flex-1 items-center justify-center overflow-hidden bg-[#08080c]"
    >
      <CanvasGrid />

      {frame && (
        <div
          className="relative shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)]"
          style={{ width: frame.w, height: frame.h }}
        >
          {/* Frame background */}
          <div className="absolute inset-0 rounded-md border border-border-strong bg-[#0d0d12] ring-1 ring-black/40" />

          {/* Active video layer */}
          {activeVideo && media ? (
            <CanvasVideoLayer
              clip={activeVideo}
              media={media}
              playhead={doc.playhead}
            />
          ) : (
            <CanvasIdleLayer aspect={aspect} />
          )}

          {/* Overlays */}
          {activeOverlays.map((o) => (
            <CanvasOverlayLayer key={o.id} clip={o} />
          ))}

          {/* Safe zones */}
          <SafeZones />

          {/* Frame chrome */}
          <FrameLabel
            aspect={aspect}
            width={frame.w}
            height={frame.h}
            playhead={doc.playhead}
          />
        </div>
      )}
    </div>
  );
}

function pickActiveVideoClip(doc: EditorDoc): VideoClip | null {
  const t = doc.playhead;
  // Topmost track (lowest order) wins for multicam.
  const videoTracks = doc.tracks
    .filter((tr) => tr.kind === "video")
    .sort((a, b) => a.order - b.order);
  for (const tr of videoTracks) {
    if (tr.muted) continue;
    const candidates = doc.clips.filter(
      (c): c is VideoClip =>
        c.kind === "video" &&
        c.trackId === tr.id &&
        c.start <= t &&
        t < c.start + c.duration,
    );
    if (candidates.length > 0) return candidates[0];
  }
  return null;
}

function pickActiveOverlayClips(doc: EditorDoc): OverlayClip[] {
  const t = doc.playhead;
  return doc.clips.filter(
    (c): c is OverlayClip =>
      c.kind === "overlay" && c.start <= t && t < c.start + c.duration,
  );
}

function CanvasGrid() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
      aria-hidden
    >
      <defs>
        <pattern
          id="canvas-grid"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#canvas-grid)" />
    </svg>
  );
}

function CanvasIdleLayer({ aspect }: { aspect: "16:9" | "9:16" }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted/60">
        No active clip · {aspect}
      </p>
      <p className="text-[12px] text-muted/80">
        Drop media on the timeline to populate the canvas.
      </p>
    </div>
  );
}

/**
 * Active video layer — renders an actual `<video>` element seeked to the
 * playhead. When the active clip changes, swap `src` and re-seek; when
 * only the playhead moves, just update `currentTime`. We never autoplay
 * — the canvas is a still preview today, not a transport surface.
 */
function CanvasVideoLayer({
  clip,
  media,
  playhead,
}: {
  clip: VideoClip;
  media: MediaBinItem;
  playhead: number;
}) {
  const t = clip.transform;
  const tx = `translate(-50%, -50%) translate(${t.x * 100}%, ${t.y * 100}%) scale(${t.scale})`;
  const ref = useRef<HTMLVideoElement>(null);
  const isPlaying = useEditorPlayback();
  // Track the URL that errored, so swapping to a new previewUrl auto-clears
  // the error state without needing a setState-in-effect dance.
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const hasError = !!media.previewUrl && erroredUrl === media.previewUrl;

  // Where in the source file should the playhead map to?
  const sourceTime = Math.max(0, clip.inPoint + (playhead - clip.start));

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (!Number.isFinite(sourceTime)) return;
    // Only seek when meaningfully different — avoids fighting the
    // browser when frames decode in.
    if (Math.abs(v.currentTime - sourceTime) > 0.05) {
      try {
        v.currentTime = sourceTime;
      } catch {
        /* seek can throw on metadata-not-ready, ignore */
      }
    }
  }, [sourceTime]);

  // Drive native playback in lockstep with the editor transport. The
  // canvas video plays muted (the audio engine routes its own audio
  // sources via `<audio>` elements) so the user only hears the active
  // mix, even when the video is the only source.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isPlaying) {
      const promise = v.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {});
      }
    } else {
      v.pause();
    }
  }, [isPlaying]);

  const showPlaceholder = !media.previewUrl || hasError;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[3px]">
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{ transform: tx, width: "100%", height: "100%" }}
      >
        {showPlaceholder ? (
          <VideoPlaceholder media={media} clip={clip} />
        ) : (
          <video
            ref={ref}
            src={media.previewUrl ?? undefined}
            className="h-full w-full bg-black object-cover"
            playsInline
            preload="metadata"
            onLoadedMetadata={() => {
              const v = ref.current;
              if (!v) return;
              try {
                v.currentTime = Math.max(0, sourceTime);
              } catch {
                /* ignore */
              }
            }}
            onError={() => setErroredUrl(media.previewUrl)}
          />
        )}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]" />
      </div>
    </div>
  );
}

function VideoPlaceholder({
  media,
  clip,
}: {
  media: MediaBinItem;
  clip: VideoClip;
}) {
  return (
    <div
      className="bg-grain relative flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1c1c25] via-[#16161e] to-[#0c0c12]"
      style={
        media.thumbnailUrl
          ? {
              backgroundImage: `url(${media.thumbnailUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex max-w-[80%] flex-col items-center gap-2 text-center">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: media.color }}
        />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Preview unavailable · {clip.label ?? media.label}
        </p>
        <p className="line-clamp-2 text-[14px] font-medium text-foreground/90">
          {media.fileName}
        </p>
      </div>
    </div>
  );
}

function CanvasOverlayLayer({ clip }: { clip: OverlayClip }) {
  if (clip.overlayKind === "lower_third") {
    return (
      <div
        className="absolute bottom-[10%] left-[6%] right-auto max-w-[60%]"
        style={{
          transform: `translate(${clip.transform.x * 100}%, ${clip.transform.y * 100}%) scale(${clip.transform.scale})`,
          transformOrigin: "left bottom",
        }}
      >
        <div className="rounded-md border-l-[3px] border-accent bg-black/65 px-3 py-2 backdrop-blur-sm">
          <p className="text-[14px] font-semibold leading-tight text-white">
            {clip.text || "Lower third"}
          </p>
          {clip.subtext && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
              {clip.subtext}
            </p>
          )}
        </div>
      </div>
    );
  }
  if (clip.overlayKind === "subscribe_cta") {
    return (
      <div className="absolute bottom-[8%] right-[6%]">
        <div className="rounded-full bg-accent px-3 py-1.5 shadow-lg shadow-accent/30">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-white">
            ▶ {clip.text || "Subscribe"}
          </p>
        </div>
      </div>
    );
  }
  if (clip.overlayKind === "sponsor_card") {
    return (
      <div className="absolute right-[6%] top-[8%] max-w-[40%]">
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 backdrop-blur-sm">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-warning">
            Sponsor
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-white">
            {clip.text || "Sponsor read"}
          </p>
        </div>
      </div>
    );
  }
  // title_card
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/70">
          {clip.subtext || ""}
        </p>
        <p className="mt-2 text-[28px] font-semibold tracking-tight text-white">
          {clip.text || "Title"}
        </p>
      </div>
    </div>
  );
}

function SafeZones() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* Action safe (~93%) */}
      <rect
        x="3.5"
        y="3.5"
        width="93"
        height="93"
        fill="none"
        stroke="rgba(244, 63, 94, 0.18)"
        strokeWidth="0.2"
        strokeDasharray="0.5 0.5"
        vectorEffect="non-scaling-stroke"
      />
      {/* Title safe (~80%) */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        fill="none"
        stroke="rgba(255, 255, 255, 0.14)"
        strokeWidth="0.2"
        strokeDasharray="0.4 0.6"
        vectorEffect="non-scaling-stroke"
      />
      {/* Centre cross */}
      <line
        x1="48"
        y1="50"
        x2="52"
        y2="50"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.3"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="50"
        y1="48"
        x2="50"
        y2="52"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function FrameLabel({
  aspect,
  width,
  height,
  playhead,
}: {
  aspect: "16:9" | "9:16";
  width: number;
  height: number;
  playhead: number;
}) {
  return (
    <>
      {/* Top-left aspect chip */}
      <div className="absolute -top-7 left-0 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        <span>Preview</span>
        <span className="text-border-strong">·</span>
        <span className="text-foreground">{aspect}</span>
        <span className="text-border-strong">·</span>
        <span>{width}×{height}</span>
      </div>
      {/* Bottom-right timecode */}
      <div className="absolute -bottom-7 right-0 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        {formatPlayheadTime(playhead)}
      </div>
    </>
  );
}
