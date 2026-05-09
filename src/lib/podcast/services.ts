"use client";

import {
  buildEmptyMedia,
  buildInitialPipeline,
  PIPELINE_STAGE_META,
} from "./pipeline";
import { getProject, saveProject } from "./storage";
import type {
  BinItemProbeSummary,
  EditorDoc,
  MediaAsset,
  MediaBinItem,
  MediaBinItemKind,
  MediaSlotKind,
  MediaTrackType,
  PipelineStage,
  PipelineStageState,
  PodcastProject,
  PodcastProjectDraft,
  StageStatus,
  ViralClipSuggestion,
} from "./types";
import { PIPELINE_STAGES } from "./types";

/**
 * Higher-level project operations.
 *
 * The service layer composes storage primitives into domain operations:
 *   createProject, attachMedia, removeMedia, advanceStage, runPipelineAction.
 *
 * Network-bound integrations (Supabase, transcription, rendering) plug in
 * here later — UI components depend only on this surface.
 */

export function generateId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${random}`;
}

export function defaultProjectTitle(now = new Date()): string {
  const d = now.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const t = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Untitled session · ${d}, ${t}`;
}

export function createProject(
  draft: Partial<PodcastProjectDraft> = {},
): PodcastProject {
  const now = new Date().toISOString();
  const title = draft.title?.trim() || defaultProjectTitle();
  const project: PodcastProject = {
    id: generateId("pod"),
    title,
    episodeNumber: draft.episodeNumber?.trim() || null,
    guests: (draft.guests ?? []).map((g) => g.trim()).filter(Boolean),
    recordedAt: draft.recordedAt || null,
    notes: draft.notes?.trim() || null,
    media: buildEmptyMedia(),
    mediaBin: [],
    editor: null,
    pipeline: buildInitialPipeline(),
    clipSuggestions: [],
    createdAt: now,
    updatedAt: now,
  };
  return saveProject(project);
}

export function updateProjectMeta(
  id: string,
  patch: Partial<PodcastProjectDraft>,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  const next: PodcastProject = {
    ...project,
    title: patch.title?.trim() ?? project.title,
    episodeNumber: patch.episodeNumber?.trim() ?? project.episodeNumber,
    guests: patch.guests
      ? patch.guests.map((g) => g.trim()).filter(Boolean)
      : project.guests,
    recordedAt: patch.recordedAt ?? project.recordedAt,
    notes: patch.notes?.trim() ?? project.notes,
  };
  return saveProject(next);
}

export function attachMedia(
  id: string,
  slot: MediaSlotKind,
  file: File,
  trackType: MediaTrackType,
  durationSec: number | null,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  const asset: MediaAsset = {
    id: generateId("media"),
    slot,
    trackType,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || (trackType === "video" ? "video/*" : "audio/*"),
    durationSec,
    importedAt: new Date().toISOString(),
  };
  const media = { ...project.media, [slot]: asset };
  const next = recomputePipelineFromMedia({ ...project, media });
  return saveProject(next);
}

export function removeMedia(
  id: string,
  slot: MediaSlotKind,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  const media = { ...project.media, [slot]: null };
  const next = recomputePipelineFromMedia({ ...project, media });
  return saveProject(next);
}

/**
 * Recompute Import + Sync stages based on the current media bin.
 *
 * Import:
 *   - complete   when at least one video source is present
 *   - in_progress when partial (e.g. only audio, no video yet)
 *   - pending    when nothing imported
 *
 * Sync:
 *   - skipped     when total source count <= 1 (nothing to align against)
 *   - pending     when 2+ sources are present (waiting for the user)
 *
 * Downstream stages are never rolled back here.
 */
function recomputePipelineFromBin(project: PodcastProject): PodcastProject {
  const bin = project.mediaBin;
  const videoCount = bin.filter((b) => b.kind === "video").length;
  const sourceCount = bin.length;
  const now = new Date().toISOString();

  let importStatus: StageStatus = "pending";
  if (videoCount >= 1) importStatus = "complete";
  else if (sourceCount > 0) importStatus = "in_progress";

  const importedPrev = project.pipeline.imported;
  const imported: PipelineStageState = {
    ...importedPrev,
    status: importStatus,
    startedAt:
      importedPrev.startedAt ??
      (importStatus !== "pending" ? now : null),
    completedAt:
      importStatus === "complete" ? importedPrev.completedAt ?? now : null,
  };

  // Sync stage rules
  const syncedPrev = project.pipeline.synced;
  let syncStatus: StageStatus = syncedPrev.status;
  let syncNote: string | null = syncedPrev.note;
  if (syncedPrev.status === "in_progress" || syncedPrev.status === "complete") {
    // Don't disturb an in-flight or finished sync.
  } else if (sourceCount <= 1) {
    syncStatus = "skipped";
    syncNote = "Single source — sync auto-skipped.";
  } else {
    syncStatus = "pending";
    syncNote = "Multiple sources — sync available.";
  }
  const synced: PipelineStageState = {
    ...syncedPrev,
    status: syncStatus,
    note: syncNote,
  };

  return {
    ...project,
    pipeline: { ...project.pipeline, imported, synced },
  };
}

/**
 * Legacy 4-slot media surface (still used by the pipeline tracker page).
 * Now delegates source counting through to the bin-aware recompute when the
 * bin is the source of truth.
 */
function recomputePipelineFromMedia(project: PodcastProject): PodcastProject {
  const slots: MediaSlotKind[] = ["camera_1", "camera_2", "mic_1", "mic_2"];
  const filled = slots.filter((s) => project.media[s] !== null);
  const videoFilled = filled.filter(
    (s) => project.media[s]?.trackType === "video",
  );

  let importStatus: StageStatus = "pending";
  if (videoFilled.length >= 1) importStatus = "complete";
  else if (filled.length > 0) importStatus = "in_progress";

  const now = new Date().toISOString();
  const importedPrev = project.pipeline.imported;
  const imported: PipelineStageState = {
    ...importedPrev,
    status: importStatus,
    startedAt:
      importedPrev.startedAt ??
      (importStatus !== "pending" ? now : null),
    completedAt:
      importStatus === "complete" ? importedPrev.completedAt ?? now : null,
  };

  const syncedPrev = project.pipeline.synced;
  let syncStatus: StageStatus = syncedPrev.status;
  let syncNote: string | null = syncedPrev.note;
  if (syncedPrev.status === "in_progress" || syncedPrev.status === "complete") {
    // Don't disturb an in-flight or finished sync.
  } else if (filled.length <= 1) {
    syncStatus = "skipped";
    syncNote = "Single source — sync auto-skipped.";
  } else {
    syncStatus = "pending";
    syncNote = "Multiple sources — sync available.";
  }
  const synced: PipelineStageState = {
    ...syncedPrev,
    status: syncStatus,
    note: syncNote,
  };

  return {
    ...project,
    pipeline: { ...project.pipeline, imported, synced },
  };
}

export function setStageStatus(
  id: string,
  stage: PipelineStage,
  status: StageStatus,
  note?: string | null,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  const prev = project.pipeline[stage];
  const now = new Date().toISOString();
  const pipeline = {
    ...project.pipeline,
    [stage]: {
      ...prev,
      status,
      startedAt:
        status === "in_progress" && !prev.startedAt ? now : prev.startedAt,
      completedAt: status === "complete" ? now : prev.completedAt,
      note: note ?? prev.note,
    },
  };
  return saveProject({ ...project, pipeline });
}

/**
 * Run the placeholder action for a stage. This is intentionally a stubbed
 * pipeline — it advances state to demonstrate the workflow shape. Real
 * processing (sync algorithms, Remotion renders, AI clipping) plugs in here
 * by replacing the timeout with an actual job runner.
 */
export async function runPipelineAction(
  id: string,
  stage: PipelineStage,
  options?: { simulateMs?: number },
): Promise<PodcastProject | null> {
  const project = getProject(id);
  if (!project) return null;

  // Pre-flight: at least the import stage must be complete before any other
  // stage runs. Sync may be `skipped` (single-source projects) or `complete` —
  // either is fine for downstream work.
  if (stage !== "imported" && project.pipeline.imported.status !== "complete") {
    setStageStatus(id, stage, "blocked", "Import a source video first.");
    return getProject(id);
  }

  setStageStatus(id, stage, "in_progress");

  const ms = options?.simulateMs ?? 1800;
  await new Promise((r) => setTimeout(r, ms));

  // Side effect: clip-finding produces suggestions.
  if (stage === "clips_generated") {
    const suggestions = synthesizeClipSuggestions();
    const current = getProject(id);
    if (current) {
      saveProject({ ...current, clipSuggestions: suggestions });
    }
  }

  return setStageStatus(id, stage, "complete", placeholderNoteFor(stage));
}

function placeholderNoteFor(stage: PipelineStage): string {
  const meta = PIPELINE_STAGE_META[stage];
  return `${meta.label} placeholder run. Real processing will replace this stub.`;
}

function synthesizeClipSuggestions(): ViralClipSuggestion[] {
  // Deterministic-ish placeholder hooks so the UI feels populated.
  const seed = [
    {
      hook: "The moment everyone got open source wrong",
      start: 312,
      end: 367,
      score: 0.92,
    },
    {
      hook: "Why this changes how you ship in 2026",
      start: 894,
      end: 947,
      score: 0.88,
    },
    {
      hook: "A cold take on the AI tooling boom",
      start: 1402,
      end: 1454,
      score: 0.81,
    },
    {
      hook: "The one rule for distribution that still works",
      start: 2218,
      end: 2272,
      score: 0.77,
    },
  ];
  return seed.map((s, i) => ({
    id: generateId(`clip${i}`),
    startSec: s.start,
    endSec: s.end,
    hook: s.hook,
    score: s.score,
  }));
}

/* ===============================
   Editor-first import surface
================================ */

const BIN_PALETTE = [
  "#f43f5e",
  "#f97316",
  "#facc15",
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

function pickBinColor(index: number): string {
  return BIN_PALETTE[index % BIN_PALETTE.length];
}

/**
 * Server-supplied metadata describing a freshly imported media file.
 * Returned by `POST /api/media/upload` and persisted into the bin item.
 */
export interface BinItemServerInfo {
  itemId: string;
  storageKey: string;
  previewUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  probe: BinItemProbeSummary | null;
}

/**
 * Commit a server-imported media file into the project bin.
 *
 * Bytes are persisted on disk (under the configured media root) — only
 * stable references and lightweight metadata land in localStorage.
 *
 * If `slotHint` is provided, any existing bin item already occupying that
 * slot is removed: each of the four import slots holds at most one source.
 */
export function addBinItem(
  id: string,
  info: BinItemServerInfo,
  kind: MediaBinItemKind,
  options?: { slotHint?: MediaSlotKind },
): { project: PodcastProject; item: MediaBinItem } | null {
  const project = getProject(id);
  if (!project) return null;
  const slotHint = options?.slotHint;

  // Slot exclusivity: drop any prior item bound to the same slot. Editor
  // doc clips referencing the displaced item are cleaned up alongside.
  const displacedIds = slotHint
    ? project.mediaBin.filter((b) => b.slotHint === slotHint).map((b) => b.id)
    : [];
  const remaining = displacedIds.length
    ? project.mediaBin.filter((b) => !displacedIds.includes(b.id))
    : project.mediaBin;

  const index = remaining.length;
  const item: MediaBinItem = {
    id: info.itemId,
    kind,
    fileName: info.fileName,
    fileSize: info.fileSize,
    mimeType:
      info.mimeType ||
      (kind === "video" ? "video/mp4" : "audio/mpeg"),
    durationSec: info.probe?.durationSec ?? null,
    importedAt: new Date().toISOString(),
    label: info.fileName.replace(/\.[^.]+$/, ""),
    color: pickBinColor(index),
    slotHint,
    storageKey: info.storageKey,
    previewUrl: info.previewUrl,
    thumbnailUrl: info.thumbnailUrl,
    probe: info.probe,
  };

  const editor = project.editor && displacedIds.length
    ? {
        ...project.editor,
        clips: project.editor.clips.filter((c) =>
          c.kind === "video" || c.kind === "audio"
            ? !displacedIds.includes(c.mediaId)
            : true,
        ),
      }
    : project.editor;

  const next = recomputePipelineFromBin({
    ...project,
    mediaBin: [...remaining, item],
    editor,
  });
  return { project: saveProject(next), item };
}

export function removeBinItem(
  id: string,
  itemId: string,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  const next = recomputePipelineFromBin({
    ...project,
    mediaBin: project.mediaBin.filter((b) => b.id !== itemId),
    editor: project.editor
      ? {
          ...project.editor,
          clips: project.editor.clips.filter((c) =>
            c.kind === "video" || c.kind === "audio"
              ? c.mediaId !== itemId
              : true,
          ),
        }
      : null,
  });
  return saveProject(next);
}

/**
 * Persist an editor document onto the project. Called by the editor store's
 * debounced autosave. Skipped if no project found (deleted while editing).
 */
export function saveEditorDoc(
  id: string,
  doc: EditorDoc,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  return saveProject({ ...project, editor: doc });
}

export function updateProjectTitle(
  id: string,
  title: string,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  const trimmed = title.trim();
  if (!trimmed) return project;
  return saveProject({ ...project, title: trimmed });
}

/** Re-export storage list/get/remove so callers can import from one place. */
export {
  listProjects,
  getProject,
  removeProject,
  subscribe,
} from "./storage";

/**
 * Probe a video or audio file for its duration via an off-DOM media element.
 * Resolves null on any error — duration is non-essential metadata.
 */
export function probeMediaDuration(
  file: File,
  trackType: MediaTrackType,
): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(null);
    const url = URL.createObjectURL(file);
    const el =
      trackType === "video"
        ? document.createElement("video")
        : document.createElement("audio");
    el.preload = "metadata";
    el.muted = true;
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) ? el.duration : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    el.src = url;
  });
}

/** Useful elsewhere; re-export the canonical stage list. */
export { PIPELINE_STAGES };
