import {
  buildEmptyMedia,
  buildInitialPipeline,
  countImportedMedia,
} from "./pipeline";
import type {
  EditorDoc,
  MediaAsset,
  MediaBinItem,
  MediaSlotKind,
  PipelineStage,
  PipelineStageState,
  PodcastProject,
  ProjectSyncRecord,
  StageStatus,
  ViralClipSuggestion,
} from "./types";
import { PIPELINE_STAGES } from "./types";

/**
 * Schema migration / normalisation for `PodcastProject` records loaded
 * from `localStorage`.
 *
 * The MVP has shipped multiple shape revisions:
 *   - v1: legacy 4-slot pipeline-first model (no mediaBin, no editor doc)
 *   - v2: editor-first (added mediaBin, editor)
 *   - v3: media backend (added storageKey/previewUrl/thumbnailUrl/probe
 *     to MediaBinItem; "skipped" added to StageStatus)
 *
 * We intentionally do not version-stamp the persisted records — each
 * field is filled in defensively at read-time. This means:
 *   - older records keep their existing data (no surprise wipes),
 *   - missing fields are populated with sensible defaults,
 *   - corrupted records are dropped (returns `null`) rather than
 *     crashing the rest of the studio.
 *
 * Always call `migratePodcastProject` at the storage boundary; UI code
 * can then assume the canonical shape.
 */

const VALID_STAGE_STATUSES: ReadonlySet<StageStatus> = new Set([
  "pending",
  "in_progress",
  "complete",
  "blocked",
  "skipped",
]);

const SLOT_KEYS: readonly MediaSlotKind[] = [
  "camera_1",
  "camera_2",
  "mic_1",
  "mic_2",
];

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function asNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asString(v: unknown, fallback: string): string {
  return isString(v) ? v : fallback;
}

function asStringOrNull(v: unknown): string | null {
  return isString(v) ? v : null;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/**
 * Normalise a single project. Returns null if the record is unsalvageable
 * (e.g. no id), so callers can drop it from the active list rather than
 * propagating a corrupt object.
 */
export function migratePodcastProject(raw: unknown): PodcastProject | null {
  if (!isObject(raw)) return null;
  const id = asString(raw.id, "");
  if (!id) return null;

  const now = new Date().toISOString();
  const createdAt = asString(raw.createdAt, now);
  const updatedAt = asString(raw.updatedAt, createdAt);

  const media = migrateMedia(raw.media);
  const mediaBin = migrateMediaBin(raw.mediaBin);
  const editor = migrateEditor(raw.editor);
  const pipeline = migratePipeline(raw.pipeline, { media, mediaBin });
  const clipSuggestions = migrateClipSuggestions(raw.clipSuggestions);
  const syncRecords = migrateSyncRecords(raw.syncRecords);

  return {
    id,
    title: asString(raw.title, "Untitled session"),
    episodeNumber: asStringOrNull(raw.episodeNumber),
    guests: Array.isArray(raw.guests)
      ? raw.guests.filter(isString)
      : [],
    recordedAt: asStringOrNull(raw.recordedAt),
    notes: asStringOrNull(raw.notes),
    media,
    mediaBin,
    editor,
    pipeline,
    clipSuggestions,
    syncRecords,
    createdAt,
    updatedAt,
  };
}

const VALID_SYNC_STATUSES: ReadonlySet<ProjectSyncRecord["status"]> = new Set([
  "not_run",
  "running",
  "ok",
  "low_confidence",
  "failed",
]);

function migrateSyncRecords(raw: unknown): ProjectSyncRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectSyncRecord[] = [];
  for (const entry of raw) {
    if (!isObject(entry)) continue;
    const id = asString(entry.id, "");
    const referenceItemId = asString(entry.referenceItemId, "");
    const candidateItemId = asString(entry.candidateItemId, "");
    if (!id || !referenceItemId || !candidateItemId) continue;
    const status = VALID_SYNC_STATUSES.has(
      entry.status as ProjectSyncRecord["status"],
    )
      ? (entry.status as ProjectSyncRecord["status"])
      : "not_run";
    out.push({
      id,
      referenceItemId,
      candidateItemId,
      status,
      offsetSec: asNumberOrNull(entry.offsetSec),
      confidence: asNumberOrNull(entry.confidence),
      peakRatio: asNumberOrNull(entry.peakRatio),
      searchWindowSec: asNumberOrNull(entry.searchWindowSec),
      method: entry.method === "peak_xcorr" ? "peak_xcorr" : null,
      error: asStringOrNull(entry.error),
      computedAt: asString(entry.computedAt, new Date().toISOString()),
    });
  }
  return out;
}

function migrateMedia(
  raw: unknown,
): Record<MediaSlotKind, MediaAsset | null> {
  const fresh = buildEmptyMedia() as Record<MediaSlotKind, MediaAsset | null>;
  if (!isObject(raw)) return fresh;
  for (const slot of SLOT_KEYS) {
    const candidate = raw[slot];
    if (!isObject(candidate)) {
      fresh[slot] = null;
      continue;
    }
    const trackType =
      candidate.trackType === "audio" || slot.startsWith("mic_")
        ? "audio"
        : "video";
    fresh[slot] = {
      id: asString(candidate.id, `${id6()}-${slot}`),
      slot,
      trackType,
      fileName: asString(candidate.fileName, "source.bin"),
      fileSize: asNumberOrNull(candidate.fileSize) ?? 0,
      mimeType: asString(
        candidate.mimeType,
        trackType === "video" ? "video/mp4" : "audio/mpeg",
      ),
      durationSec: asNumberOrNull(candidate.durationSec),
      importedAt: asString(candidate.importedAt, new Date().toISOString()),
    };
  }
  return fresh;
}

function migrateMediaBin(raw: unknown): MediaBinItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MediaBinItem[] = [];
  for (const entry of raw) {
    if (!isObject(entry)) continue;
    const id = asString(entry.id, "");
    if (!id) continue;
    const kind = entry.kind === "audio" ? "audio" : "video";
    out.push({
      id,
      kind,
      fileName: asString(entry.fileName, "source.bin"),
      fileSize: asNumberOrNull(entry.fileSize) ?? 0,
      mimeType: asString(
        entry.mimeType,
        kind === "video" ? "video/mp4" : "audio/mpeg",
      ),
      durationSec: asNumberOrNull(entry.durationSec),
      importedAt: asString(entry.importedAt, new Date().toISOString()),
      label: asString(
        entry.label,
        asString(entry.fileName, "Source").replace(/\.[^.]+$/, ""),
      ),
      color: asString(entry.color, "#6366f1"),
      slotHint: isValidSlot(entry.slotHint) ? entry.slotHint : undefined,
      storageKey: asStringOrNull(entry.storageKey),
      previewUrl: asStringOrNull(entry.previewUrl),
      thumbnailUrl: asStringOrNull(entry.thumbnailUrl),
      probe: migrateProbeSummary(entry.probe),
      audioReady: asBool(entry.audioReady, false),
      audioUrl: asStringOrNull(entry.audioUrl),
      waveformReady: asBool(entry.waveformReady, false),
      waveformUrl: asStringOrNull(entry.waveformUrl),
      waveform: migrateWaveformInfo(entry.waveform),
      processingJobId: asStringOrNull(entry.processingJobId),
      processingState: migrateProcessingState(entry.processingState),
      processingError: asStringOrNull(entry.processingError),
    });
  }
  return out;
}

function migrateWaveformInfo(raw: unknown): MediaBinItem["waveform"] {
  if (!isObject(raw)) return null;
  return {
    peaksPerSecond: asNumberOrNull(raw.peaksPerSecond) ?? 0,
    peakCount: asNumberOrNull(raw.peakCount) ?? 0,
    durationSec: asNumberOrNull(raw.durationSec) ?? 0,
  };
}

const VALID_PROCESSING_STATES: ReadonlySet<MediaBinItem["processingState"]> =
  new Set(["idle", "queued", "extracting_audio", "waveform", "ready", "failed"]);

function migrateProcessingState(raw: unknown): MediaBinItem["processingState"] {
  if (
    isString(raw) &&
    VALID_PROCESSING_STATES.has(raw as MediaBinItem["processingState"])
  ) {
    return raw as MediaBinItem["processingState"];
  }
  return "idle";
}

function isValidSlot(v: unknown): v is MediaSlotKind {
  return isString(v) && (SLOT_KEYS as readonly string[]).includes(v);
}

function migrateProbeSummary(
  raw: unknown,
): MediaBinItem["probe"] {
  if (!isObject(raw)) return null;
  return {
    durationSec: asNumberOrNull(raw.durationSec),
    bitRate: asNumberOrNull(raw.bitRate),
    videoCodec: asStringOrNull(raw.videoCodec),
    width: asNumberOrNull(raw.width),
    height: asNumberOrNull(raw.height),
    fps: asNumberOrNull(raw.fps),
    audioCodec: asStringOrNull(raw.audioCodec),
    audioChannels: asNumberOrNull(raw.audioChannels),
    audioSampleRate: asNumberOrNull(raw.audioSampleRate),
    audioStreamCount: asNumberOrNull(raw.audioStreamCount) ?? 0,
  };
}

function migrateEditor(raw: unknown): EditorDoc | null {
  if (!isObject(raw)) return null;
  // We trust the editor doc as-written when it's an object — the editor
  // store hydrates further on mount. If the shape is broken, the editor
  // simply boots a fresh default doc.
  // We DO normalise the few "must-have" surfaces so collaborators don't
  // crash before the store gets a chance.
  return {
    version: 1,
    aspect: raw.aspect === "9:16" ? "9:16" : "16:9",
    duration: asNumberOrNull(raw.duration) ?? 0,
    playhead: asNumberOrNull(raw.playhead) ?? 0,
    zoom: asNumberOrNull(raw.zoom) ?? 80,
    snapPixels: asNumberOrNull(raw.snapPixels) ?? 8,
    snapEnabled: asBool(raw.snapEnabled, true),
    tracks: Array.isArray(raw.tracks)
      ? (raw.tracks as EditorDoc["tracks"])
      : [],
    clips: Array.isArray(raw.clips)
      ? (raw.clips as EditorDoc["clips"])
      : [],
    markers: Array.isArray(raw.markers)
      ? (raw.markers as EditorDoc["markers"])
      : [],
    inPoint: asNumberOrNull(raw.inPoint),
    outPoint: asNumberOrNull(raw.outPoint),
    viralClips: Array.isArray(raw.viralClips)
      ? (raw.viralClips as EditorDoc["viralClips"])
      : [],
    selection: Array.isArray(raw.selection)
      ? (raw.selection as string[]).filter(isString)
      : [],
  };
}

function migratePipeline(
  raw: unknown,
  ctx: {
    media: Record<MediaSlotKind, MediaAsset | null>;
    mediaBin: MediaBinItem[];
  },
): Record<PipelineStage, PipelineStageState> {
  const fresh = buildInitialPipeline();
  if (isObject(raw)) {
    for (const stage of PIPELINE_STAGES) {
      const candidate = raw[stage];
      if (!isObject(candidate)) continue;
      const status = VALID_STAGE_STATUSES.has(candidate.status as StageStatus)
        ? (candidate.status as StageStatus)
        : "pending";
      fresh[stage] = {
        stage,
        status,
        startedAt: asStringOrNull(candidate.startedAt),
        completedAt: asStringOrNull(candidate.completedAt),
        note: asStringOrNull(candidate.note),
      };
    }
  }

  // Auto-correct the import + sync stages from the source counts. This
  // keeps legacy v1 records (with no mediaBin) consistent with the
  // editor-first rules without forcing the user to re-trigger anything.
  const sourceCount =
    ctx.mediaBin.length > 0
      ? ctx.mediaBin.length
      : countImportedMedia(ctx.media);
  const videoCount =
    ctx.mediaBin.length > 0
      ? ctx.mediaBin.filter((b) => b.kind === "video").length
      : Object.values(ctx.media).filter((a) => a?.trackType === "video").length;

  if (fresh.imported.status !== "complete" && fresh.imported.status !== "in_progress") {
    if (videoCount >= 1) fresh.imported = { ...fresh.imported, status: "complete" };
    else if (sourceCount > 0) fresh.imported = { ...fresh.imported, status: "in_progress" };
  }
  if (fresh.synced.status !== "in_progress" && fresh.synced.status !== "complete") {
    fresh.synced = {
      ...fresh.synced,
      status: sourceCount <= 1 ? "skipped" : "pending",
      note:
        sourceCount <= 1
          ? "Single source — sync auto-skipped."
          : "Multiple sources — sync available.",
    };
  }

  return fresh;
}

function migrateClipSuggestions(raw: unknown): ViralClipSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: ViralClipSuggestion[] = [];
  for (const entry of raw) {
    if (!isObject(entry)) continue;
    const id = asString(entry.id, "");
    if (!id) continue;
    out.push({
      id,
      startSec: asNumberOrNull(entry.startSec) ?? 0,
      endSec: asNumberOrNull(entry.endSec) ?? 0,
      hook: asString(entry.hook, ""),
      score: asNumberOrNull(entry.score) ?? 0,
    });
  }
  return out;
}

function id6(): string {
  return Math.random().toString(36).slice(2, 8);
}

/* ===============================
   Defensive helpers for UI reads
================================ */

/**
 * Safely access the media bin. Use in components that may receive a
 * legacy project shape mid-migration (e.g. read directly from another
 * tab's storage write that hasn't gone through our migration boundary).
 */
export function getProjectMediaBin(
  project: Pick<PodcastProject, "mediaBin"> | null | undefined,
): MediaBinItem[] {
  if (!project) return [];
  return Array.isArray(project.mediaBin) ? project.mediaBin : [];
}

export function getProjectEditor(
  project: Pick<PodcastProject, "editor"> | null | undefined,
): EditorDoc | null {
  if (!project) return null;
  return project.editor ?? null;
}

export function getProjectClips(
  project: Pick<PodcastProject, "editor"> | null | undefined,
) {
  return getProjectEditor(project)?.clips ?? [];
}

export function getProjectViralClips(
  project: Pick<PodcastProject, "editor"> | null | undefined,
) {
  return getProjectEditor(project)?.viralClips ?? [];
}

export function getProjectAspect(
  project: Pick<PodcastProject, "editor"> | null | undefined,
) {
  return getProjectEditor(project)?.aspect ?? "16:9";
}
