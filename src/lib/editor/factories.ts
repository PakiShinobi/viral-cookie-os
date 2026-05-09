import { generateId } from "@/lib/podcast/services";
import type {
  AudioClip,
  CaptionClip,
  ClipTransform,
  EditorClip,
  EditorDoc,
  MediaBinItem,
  OverlayClip,
  OverlayKind,
  Track,
  VideoClip,
} from "./types";
import { DEFAULT_ZOOM } from "./timeline-math";

/**
 * Pure factories for editor entities. Used by the store to mint new tracks
 * and clips with correct defaults. Anything mutable lives here; mutators
 * compose these factories.
 */

export const TRACK_HEIGHTS = {
  video: 60,
  audio: 44,
  overlay: 40,
  caption: 32,
  marker: 28,
} as const;

export function defaultTransform(): ClipTransform {
  return {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
  };
}

export function makeTrack(
  kind: Track["kind"],
  name: string,
  order: number,
): Track {
  return {
    id: generateId("trk"),
    kind,
    name,
    order,
    height: TRACK_HEIGHTS[kind],
    muted: false,
    solo: false,
    locked: false,
  };
}

/**
 * Build the canonical track stack for a fresh project.
 *
 * Order (top to bottom on the timeline):
 *   V2 — secondary camera / multicam B
 *   V1 — primary camera
 *   Overlay — lower thirds, sponsor cards, subscribe CTAs
 *   Caption — burned captions
 *   A1, A2 — host + guest mics
 *   A3 — music / sfx
 *   Markers — sponsor reads, chapters, highlights
 */
export function buildDefaultTracks(): Track[] {
  return [
    makeTrack("video", "V2 · Camera B", 0),
    makeTrack("video", "V1 · Camera A", 1),
    makeTrack("overlay", "Overlay", 2),
    makeTrack("caption", "Captions", 3),
    makeTrack("audio", "A1 · Host", 4),
    makeTrack("audio", "A2 · Guest", 5),
    makeTrack("audio", "A3 · Music & SFX", 6),
    makeTrack("marker", "Markers", 7),
  ];
}

export function buildDefaultEditorDoc(): EditorDoc {
  return {
    version: 1,
    aspect: "16:9",
    duration: 60,
    playhead: 0,
    zoom: DEFAULT_ZOOM,
    snapPixels: 8,
    snapEnabled: true,
    tracks: buildDefaultTracks(),
    clips: [],
    markers: [],
    inPoint: null,
    outPoint: null,
    viralClips: [],
    selection: [],
  };
}

/* ===============================
   Clip factories
================================ */

export function makeVideoClip(args: {
  trackId: string;
  mediaId: string;
  start: number;
  duration: number;
  inPoint?: number;
  multicamGroup?: string | null;
  label?: string | null;
}): VideoClip {
  return {
    id: generateId("clip"),
    kind: "video",
    trackId: args.trackId,
    mediaId: args.mediaId,
    start: args.start,
    duration: args.duration,
    inPoint: args.inPoint ?? 0,
    label: args.label ?? null,
    transform: defaultTransform(),
    multicamGroup: args.multicamGroup ?? null,
  };
}

export function makeAudioClip(args: {
  trackId: string;
  mediaId: string;
  start: number;
  duration: number;
  inPoint?: number;
  gain?: number;
  label?: string | null;
}): AudioClip {
  return {
    id: generateId("clip"),
    kind: "audio",
    trackId: args.trackId,
    mediaId: args.mediaId,
    start: args.start,
    duration: args.duration,
    inPoint: args.inPoint ?? 0,
    label: args.label ?? null,
    gain: args.gain ?? 1,
  };
}

export function makeOverlayClip(args: {
  trackId: string;
  overlayKind: OverlayKind;
  start: number;
  duration?: number;
  text: string;
  subtext?: string | null;
  markerId?: string | null;
}): OverlayClip {
  return {
    id: generateId("clip"),
    kind: "overlay",
    trackId: args.trackId,
    overlayKind: args.overlayKind,
    start: args.start,
    duration: args.duration ?? defaultOverlayDuration(args.overlayKind),
    inPoint: 0,
    label: null,
    text: args.text,
    subtext: args.subtext ?? null,
    transform: defaultTransform(),
    markerId: args.markerId ?? null,
  };
}

export function makeCaptionClip(args: {
  trackId: string;
  start: number;
  duration: number;
  text: string;
}): CaptionClip {
  return {
    id: generateId("clip"),
    kind: "caption",
    trackId: args.trackId,
    start: args.start,
    duration: args.duration,
    inPoint: 0,
    label: null,
    text: args.text,
  };
}

function defaultOverlayDuration(kind: OverlayKind): number {
  switch (kind) {
    case "lower_third":
      return 6;
    case "sponsor_card":
      return 30;
    case "subscribe_cta":
      return 5;
    case "title_card":
      return 4;
  }
}

/**
 * From a media bin item, choose the appropriate track and create a clip
 * placed at `dropTime`. Used when a user drags media to the timeline.
 */
export function clipForMedia(
  doc: EditorDoc,
  media: MediaBinItem,
  dropTime: number,
): { clip: EditorClip; trackId: string } | null {
  const wantedKind: Track["kind"] = media.kind === "video" ? "video" : "audio";
  // Use the first matching track, preferring the lowest-order one.
  const tracks = [...doc.tracks].sort((a, b) => a.order - b.order);
  const track = tracks.find((t) => t.kind === wantedKind);
  if (!track) return null;

  const duration = media.durationSec ?? 30;
  if (media.kind === "video") {
    return {
      trackId: track.id,
      clip: makeVideoClip({
        trackId: track.id,
        mediaId: media.id,
        start: dropTime,
        duration,
        label: media.label,
      }),
    };
  }
  return {
    trackId: track.id,
    clip: makeAudioClip({
      trackId: track.id,
      mediaId: media.id,
      start: dropTime,
      duration,
      label: media.label,
    }),
  };
}
