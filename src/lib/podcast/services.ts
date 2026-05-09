"use client";

import {
  buildEmptyMedia,
  buildInitialPipeline,
  PIPELINE_STAGE_META,
} from "./pipeline";
import { getProject, saveProject } from "./storage";
import type {
  EditorDoc,
  MediaAsset,
  MediaBinItem,
  MediaBinItemKind,
  MediaSlotKind,
  MediaTrackType,
  PipelineStage,
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
  const next = recomputeImportStage({ ...project, media });
  return saveProject(next);
}

export function removeMedia(
  id: string,
  slot: MediaSlotKind,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  const media = { ...project.media, [slot]: null };
  const next = recomputeImportStage({ ...project, media });
  return saveProject(next);
}

/**
 * The Imported stage auto-completes when all four slots are populated.
 * Removing media from a complete project rolls the stage back to in_progress.
 */
function recomputeImportStage(project: PodcastProject): PodcastProject {
  const slots: MediaSlotKind[] = ["camera_1", "camera_2", "mic_1", "mic_2"];
  const filled = slots.filter((s) => project.media[s] !== null).length;
  let status: StageStatus = "pending";
  if (filled === slots.length) status = "complete";
  else if (filled > 0) status = "in_progress";

  const importedState = project.pipeline.imported;
  const now = new Date().toISOString();
  const pipeline = {
    ...project.pipeline,
    imported: {
      ...importedState,
      status,
      startedAt:
        importedState.startedAt ??
        (status !== "pending" ? now : null),
      completedAt: status === "complete" ? now : null,
    },
  };

  // If the import stage is no longer complete, downstream stages that were
  // pending stay pending, but never roll back completed downstream work
  // automatically — that would be destructive and surprising.
  return { ...project, pipeline };
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

  // Pre-flight: imported stage must be complete before any other stage runs.
  if (stage !== "imported" && project.pipeline.imported.status !== "complete") {
    setStageStatus(id, stage, "blocked", "Import all media before running.");
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
 * Add a media file to the project bin. Returns the updated project.
 *
 * Files are stored as metadata only (filename, size, duration). Real bytes
 * stay on the user's disk. The editor preview and downstream ffmpeg /
 * Remotion export plug into this same surface later.
 */
export function addBinItem(
  id: string,
  file: File,
  kind: MediaBinItemKind,
  durationSec: number | null,
  options?: { slotHint?: MediaSlotKind },
): { project: PodcastProject; item: MediaBinItem } | null {
  const project = getProject(id);
  if (!project) return null;
  const index = project.mediaBin.length;
  const item: MediaBinItem = {
    id: generateId("bin"),
    kind,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || (kind === "video" ? "video/*" : "audio/*"),
    durationSec,
    importedAt: new Date().toISOString(),
    label: file.name.replace(/\.[^.]+$/, ""),
    color: pickBinColor(index),
    slotHint: options?.slotHint,
  };
  const next = saveProject({
    ...project,
    mediaBin: [...project.mediaBin, item],
  });
  return { project: next, item };
}

export function removeBinItem(
  id: string,
  itemId: string,
): PodcastProject | null {
  const project = getProject(id);
  if (!project) return null;
  return saveProject({
    ...project,
    mediaBin: project.mediaBin.filter((b) => b.id !== itemId),
    // Drop any clips referencing this media from the editor doc.
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
