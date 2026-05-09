/**
 * Editor types — re-exported from the podcast domain so editor code never
 * has to reach across to the podcast package for shapes. The editor depends
 * on the domain, not the other way round.
 */

export type {
  AspectRatio,
  CaptionClip,
  ClipBase,
  ClipTransform,
  EditorClip,
  EditorDoc,
  ExportPreset,
  ExportPresetId,
  Marker,
  MarkerKind,
  MediaBinItem,
  OverlayClip,
  OverlayKind,
  Track,
  TrackKind,
  VideoClip,
  AudioClip,
  ViralClipRegion,
} from "@/lib/podcast/types";

/** Edges of a clip during a trim drag. */
export type TrimEdge = "left" | "right";

/** Result of a snap calculation. */
export interface SnapResult {
  time: number;
  /** Whether a snap target was found within tolerance. */
  snapped: boolean;
  /** What we snapped to (for visual indicator). */
  target: "playhead" | "clip-edge" | "marker" | "in" | "out" | null;
}
