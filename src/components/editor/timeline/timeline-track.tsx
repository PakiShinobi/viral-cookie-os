"use client";

import { timeToPx } from "@/lib/editor/timeline-math";
import type { EditorDoc, Track } from "@/lib/editor/types";
import type { PodcastProject } from "@/lib/podcast/types";
import { TimelineClip } from "./timeline-clip";
import { TimelineMarker } from "./timeline-marker";

/**
 * One track lane. Renders the lane background and all clips/markers
 * placed on it. Clip pointer events are owned by TimelineClip.
 */
export function TimelineTrack({
  track,
  doc,
  project,
}: {
  track: Track;
  doc: EditorDoc;
  project: PodcastProject;
}) {
  const isMarkerLane = track.kind === "marker";
  const clips = doc.clips.filter((c) => c.trackId === track.id);
  const markers = isMarkerLane ? doc.markers : [];

  return (
    <div
      className={`relative border-b border-border ${
        track.locked ? "opacity-60" : ""
      }`}
      style={{ height: track.height }}
    >
      {/* Lane background — subtle stripes for video/audio */}
      <div
        aria-hidden
        className={`absolute inset-0 ${
          track.kind === "video"
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.012),transparent)]"
            : track.kind === "audio"
              ? "bg-[linear-gradient(180deg,rgba(16,185,129,0.04),transparent)]"
              : track.kind === "overlay"
                ? "bg-[linear-gradient(180deg,rgba(244,63,94,0.04),transparent)]"
                : ""
        }`}
      />

      {/* Vertical second-grid behind clips for visual rhythm */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: `${timeToPx(1, doc.zoom)}px 100%`,
        }}
      />

      {clips.map((clip) => (
        <TimelineClip
          key={clip.id}
          clip={clip}
          track={track}
          zoom={doc.zoom}
          selected={doc.selection.includes(clip.id)}
          mediaBin={project.mediaBin}
        />
      ))}

      {markers.map((m) => (
        <TimelineMarker key={m.id} marker={m} zoom={doc.zoom} />
      ))}
    </div>
  );
}
