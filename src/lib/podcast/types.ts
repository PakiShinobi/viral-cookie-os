/**
 * Podcast workflow type system.
 *
 * Strong types describing the end-to-end podcast production pipeline:
 *   Imported -> Synced -> Full Episode Edit -> Audio Export -> Clips -> Ready to Publish.
 *
 * This is the canonical schema. All UI, storage, and service layers depend
 * on it. Avoid mutating shapes inline — extend types here first.
 */

export type MediaSlotKind = "camera_1" | "camera_2" | "mic_1" | "mic_2";

export type MediaTrackType = "video" | "audio";

export interface MediaAsset {
  id: string;
  slot: MediaSlotKind;
  trackType: MediaTrackType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSec: number | null;
  importedAt: string;
}

/**
 * Pipeline stages, in canonical order. Index = step number (0-based).
 * Display number is index + 1.
 */
export const PIPELINE_STAGES = [
  "imported",
  "synced",
  "full_episode_edit",
  "audio_export",
  "clips_generated",
  "ready_to_publish",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type StageStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "blocked"
  | "skipped";

export interface PipelineStageState {
  stage: PipelineStage;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  note: string | null;
}

export type DistributionPlatform =
  | "youtube"
  | "youtube_shorts"
  | "spotify"
  | "apple_podcasts"
  | "rss"
  | "tiktok"
  | "instagram_reels";

export interface ViralClipSuggestion {
  id: string;
  startSec: number;
  endSec: number;
  hook: string;
  score: number;
}

export interface PodcastProject {
  id: string;
  title: string;
  episodeNumber: string | null;
  guests: string[];
  recordedAt: string | null;
  notes: string | null;
  /** Legacy 4-slot import surface — preserved for the pipeline tracker. */
  media: Record<MediaSlotKind, MediaAsset | null>;
  /** Editor-first import surface. Flexible array of imported sources. */
  mediaBin: MediaBinItem[];
  /**
   * Embedded editor document. Created when the user enters the editor for
   * the first time (or when the project is bootstrapped via the new flow).
   * Persisted alongside the project; mutations are debounced from the
   * in-memory editor store.
   */
  editor: EditorDoc | null;
  pipeline: Record<PipelineStage, PipelineStageState>;
  clipSuggestions: ViralClipSuggestion[];
  /**
   * Per-pair sync diagnostics — populated by the Sync stage. Stored on
   * the project so the editor can show alignment offsets and confidence
   * without re-running the analysis.
   */
  syncRecords: ProjectSyncRecord[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Slim, project-persisted shape of `SyncRecord` from `lib/media/types`.
 * Re-declared here to avoid pulling the server-side media types into
 * the client bundle and to keep the project schema self-contained.
 */
export interface ProjectSyncRecord {
  id: string;
  referenceItemId: string;
  candidateItemId: string;
  status: "not_run" | "running" | "ok" | "low_confidence" | "failed";
  offsetSec: number | null;
  confidence: number | null;
  peakRatio: number | null;
  searchWindowSec: number | null;
  method: "peak_xcorr" | null;
  error: string | null;
  computedAt: string;
}

/* ===============================
   Editor-first media bin
================================ */

export type MediaBinItemKind = "video" | "audio";

/**
 * Compact probe summary persisted to project state. The full ffprobe payload
 * (raw JSON) lives next to the source file on disk and can be re-loaded if
 * heavier metadata is ever needed.
 */
export interface BinItemProbeSummary {
  durationSec: number | null;
  bitRate: number | null;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  audioCodec: string | null;
  audioChannels: number | null;
  audioSampleRate: number | null;
  audioStreamCount: number;
}

export type BinItemProcessingState =
  | "idle"
  | "queued"
  | "extracting_audio"
  | "waveform"
  | "ready"
  | "failed";

/**
 * Compact pointer to the waveform peaks resource. Held on the bin item
 * so the timeline can size its render before the JSON is loaded.
 */
export interface BinItemWaveformInfo {
  peaksPerSecond: number;
  peakCount: number;
  durationSec: number;
}

export interface MediaBinItem {
  id: string;
  kind: MediaBinItemKind;
  fileName: string;
  fileSize: number;
  mimeType: string;
  durationSec: number | null;
  importedAt: string;
  /** User-editable display label. Defaults to fileName. */
  label: string;
  /** Hex color used to tint clip blocks on the timeline. */
  color: string;
  /** Optional original slot hint from the legacy 4-slot import flow. */
  slotHint?: MediaSlotKind;
  /**
   * Server-side stable reference. `<projectId>/<itemId>` form. Files live
   * under the configured media root (`data/media/` by default). Null while
   * an upload is mid-flight or for legacy items pre-server-storage.
   */
  storageKey: string | null;
  /** Local API route serving the source file with Range support. */
  previewUrl: string | null;
  /** Local API route serving the generated thumbnail (video only). */
  thumbnailUrl: string | null;
  /** Compact probe metadata. Null until probing completes / fails. */
  probe: BinItemProbeSummary | null;
  /**
   * Audio extraction state. For video sources we extract a separate
   * PCM WAV that the editor uses for analysis and (eventually) sync.
   * For audio-only sources `audioReady` flips true once peaks land —
   * the WAV is the source itself.
   */
  audioReady: boolean;
  audioUrl: string | null;
  /** Real waveform peaks endpoint, populated after the waveform job. */
  waveformReady: boolean;
  waveformUrl: string | null;
  waveform: BinItemWaveformInfo | null;
  /** Tracks the in-flight processing job so the client can poll. */
  processingJobId: string | null;
  processingState: BinItemProcessingState;
  processingError: string | null;
}

/* ===============================
   Editor document
================================ */

export type AspectRatio = "16:9" | "9:16";

export type TrackKind = "video" | "audio" | "overlay" | "caption" | "marker";

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  /** Vertical layout order (top of the timeline = lowest index). */
  order: number;
  height: number;
  muted: boolean;
  solo: boolean;
  locked: boolean;
}

export interface ClipTransform {
  /** Center-relative offset, fraction of canvas width/height. -0.5..0.5 */
  x: number;
  y: number;
  /** 1 = fit; values >1 zoom in (used heavily for 9:16 reframing). */
  scale: number;
  /** Rotation in degrees. */
  rotation: number;
  crop: { top: number; right: number; bottom: number; left: number };
}

export interface ClipBase {
  id: string;
  trackId: string;
  /** Timeline position, seconds. */
  start: number;
  /** Timeline length, seconds. */
  duration: number;
  /** Offset within the source media, seconds. */
  inPoint: number;
  label: string | null;
}

export type OverlayKind =
  | "lower_third"
  | "sponsor_card"
  | "subscribe_cta"
  | "title_card";

export interface VideoClip extends ClipBase {
  kind: "video";
  mediaId: string;
  transform: ClipTransform;
  /**
   * Multicam slot association. When two video tracks contain time-overlapping
   * clips referencing the same recording session, the topmost track wins.
   * `multicamGroup` lets a future switcher pick the active angle without
   * destructive edits.
   */
  multicamGroup: string | null;
}

export interface AudioClip extends ClipBase {
  kind: "audio";
  mediaId: string;
  /** Linear gain. 1 = unity. */
  gain: number;
}

export interface OverlayClip extends ClipBase {
  kind: "overlay";
  overlayKind: OverlayKind;
  text: string;
  subtext: string | null;
  transform: ClipTransform;
  /** Sponsor reads also appear as timeline markers — this links them. */
  markerId?: string | null;
}

export interface CaptionClip extends ClipBase {
  kind: "caption";
  text: string;
}

export type EditorClip = VideoClip | AudioClip | OverlayClip | CaptionClip;

export type MarkerKind =
  | "sponsor"
  | "chapter"
  | "highlight"
  | "subscribe_cta";

export interface Marker {
  id: string;
  kind: MarkerKind;
  time: number;
  label: string;
}

export type ExportPresetId =
  | "long_form_youtube"
  | "audio_mp3"
  | "vertical_short"
  | "vertical_reel"
  | "tiktok";

export interface ExportPreset {
  id: ExportPresetId;
  name: string;
  aspect: AspectRatio;
  format: "mp4" | "mp3" | "wav";
  resolution: { width: number; height: number };
  fps: number | null;
  destination: string;
}

export interface ViralClipRegion {
  id: string;
  label: string;
  /** Source timeline range (seconds). */
  start: number;
  end: number;
  aspect: AspectRatio;
  preset: ExportPresetId;
  createdAt: string;
}

export interface EditorDoc {
  version: 1;
  aspect: AspectRatio;
  /** Total project duration in seconds. */
  duration: number;
  /** Current playhead in seconds. */
  playhead: number;
  /** Pixels per second on the timeline. */
  zoom: number;
  /** Snapping tolerance in pixels. */
  snapPixels: number;
  snapEnabled: boolean;
  tracks: Track[];
  clips: EditorClip[];
  markers: Marker[];
  /** Mark-in / mark-out for clip extraction. */
  inPoint: number | null;
  outPoint: number | null;
  /** Saved viral clip regions, ready for export. */
  viralClips: ViralClipRegion[];
  /** IDs of currently-selected clips. */
  selection: string[];
}

/** Input shape used by the project creation form. */
export interface PodcastProjectDraft {
  title: string;
  episodeNumber?: string;
  guests?: string[];
  recordedAt?: string;
  notes?: string;
}

/** Static metadata describing each pipeline stage for display. */
export interface PipelineStageMeta {
  stage: PipelineStage;
  number: number;
  label: string;
  shortLabel: string;
  description: string;
  /** Sub-tasks shown as a checklist on the stage card. */
  checklist: readonly string[];
  /** Action button label and id for placeholder processing. */
  action: {
    id: PipelineActionId;
    label: string;
    runningLabel: string;
  };
  /** Distribution targets surfaced on the stage card. */
  targets: readonly DistributionPlatform[];
}

export type PipelineActionId =
  | "sync_media"
  | "create_full_episode"
  | "create_audio_episode"
  | "find_viral_clips"
  | "export";
