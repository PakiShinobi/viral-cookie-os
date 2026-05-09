import type {
  DistributionPlatform,
  MediaSlotKind,
  PipelineStage,
  PipelineStageMeta,
  PipelineStageState,
  PodcastProject,
} from "./types";
import { PIPELINE_STAGES } from "./types";

/**
 * Static descriptors for every pipeline stage. The single source of truth
 * for stage labels, copy, sub-tasks, action buttons, and targets.
 *
 * UI components should never hardcode stage strings — read from here.
 */
/**
 * Stage IDs are kept stable so existing local projects continue to load
 * with their pipeline state intact, even though the labels have shifted
 * to the editor-first vocabulary (Import / Sync / Editor / Audio / Viral
 * Clips / Distribution).
 */
export const PIPELINE_STAGE_META: Record<PipelineStage, PipelineStageMeta> = {
  imported: {
    stage: "imported",
    number: 1,
    label: "Import",
    shortLabel: "Import",
    description: "Bring source media into the project — one video minimum.",
    checklist: [
      "Video 1 / Camera A imported",
      "Video 2 / Camera B (optional)",
      "Mic 1 (optional)",
      "Mic 2 (optional)",
    ],
    action: {
      id: "sync_media",
      label: "Continue to Sync",
      runningLabel: "Preparing media",
    },
    targets: [],
  },
  synced: {
    stage: "synced",
    number: 2,
    label: "Sync",
    shortLabel: "Sync",
    description:
      "Align mic audio to camera tracks. Auto-skipped on single-source projects.",
    checklist: [
      "Detect waveform offset across tracks",
      "Lock multi-cam to mic timecode",
      "Trim ragged head and tail",
    ],
    action: {
      id: "sync_media",
      label: "Sync Media",
      runningLabel: "Syncing tracks",
    },
    targets: [],
  },
  full_episode_edit: {
    stage: "full_episode_edit",
    number: 3,
    label: "Editor",
    shortLabel: "Editor",
    description:
      "Cut on the multi-track timeline: switching, overlays, name cards, CTAs.",
    checklist: [
      "Trim start and end",
      "Camera switching pass",
      "Sponsor ad insertion",
      "Namecards and lower thirds",
      "Subscribe CTA overlays",
    ],
    action: {
      id: "create_full_episode",
      label: "Open Editor",
      runningLabel: "Opening editor",
    },
    targets: ["youtube"],
  },
  audio_export: {
    stage: "audio_export",
    number: 4,
    label: "Audio Export",
    shortLabel: "Audio",
    description:
      "Render a clean audio-only master for podcast platforms.",
    checklist: [
      "Strip video tracks",
      "Trim show open and close",
      "Render MP3 master",
      "Tag metadata for RSS",
    ],
    action: {
      id: "create_audio_episode",
      label: "Create Audio Episode",
      runningLabel: "Rendering audio",
    },
    targets: ["spotify", "apple_podcasts", "rss"],
  },
  clips_generated: {
    stage: "clips_generated",
    number: 5,
    label: "Viral Clips",
    shortLabel: "Clips",
    description:
      "Mark hook moments and produce 9:16 reels under 60 seconds.",
    checklist: [
      "Identify hook moments",
      "Mark in/out regions",
      "Reframe to 9:16",
      "Burn in captions",
    ],
    action: {
      id: "find_viral_clips",
      label: "Find Viral Clips",
      runningLabel: "Scanning episode",
    },
    targets: ["tiktok", "instagram_reels", "youtube_shorts"],
  },
  ready_to_publish: {
    stage: "ready_to_publish",
    number: 6,
    label: "Distribution",
    shortLabel: "Distribute",
    description: "Stage every output for delivery to the platforms.",
    checklist: [
      "YouTube long-form",
      "Spotify / Apple Podcasts",
      "TikTok / Reels / Shorts",
    ],
    action: {
      id: "export",
      label: "Export",
      runningLabel: "Packaging exports",
    },
    targets: [
      "youtube",
      "spotify",
      "apple_podcasts",
      "tiktok",
      "instagram_reels",
      "youtube_shorts",
    ],
  },
};

export const MEDIA_SLOTS: ReadonlyArray<{
  slot: MediaSlotKind;
  label: string;
  shortLabel: string;
  trackType: "video" | "audio";
  accept: string;
  hint: string;
  required: boolean;
}> = [
  {
    slot: "camera_1",
    label: "Video 1 · Camera A",
    shortLabel: "V1",
    trackType: "video",
    accept: "video/*",
    hint: "Primary camera. Required.",
    required: true,
  },
  {
    slot: "camera_2",
    label: "Video 2 · Camera B",
    shortLabel: "V2",
    trackType: "video",
    accept: "video/*",
    hint: "Optional second camera angle.",
    required: false,
  },
  {
    slot: "mic_1",
    label: "Mic 1",
    shortLabel: "M1",
    trackType: "audio",
    accept: "audio/*",
    hint: "Host microphone. Optional.",
    required: false,
  },
  {
    slot: "mic_2",
    label: "Mic 2",
    shortLabel: "M2",
    trackType: "audio",
    accept: "audio/*",
    hint: "Guest microphone. Optional.",
    required: false,
  },
];

export const PLATFORM_META: Record<
  DistributionPlatform,
  { label: string; family: "video" | "audio" | "short_form" }
> = {
  youtube: { label: "YouTube", family: "video" },
  youtube_shorts: { label: "YouTube Shorts", family: "short_form" },
  spotify: { label: "Spotify", family: "audio" },
  apple_podcasts: { label: "Apple Podcasts", family: "audio" },
  rss: { label: "Podcast RSS", family: "audio" },
  tiktok: { label: "TikTok", family: "short_form" },
  instagram_reels: { label: "Instagram Reels", family: "short_form" },
};

/** Build the initial pipeline state for a brand-new project. */
export function buildInitialPipeline(): Record<
  PipelineStage,
  PipelineStageState
> {
  return PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = {
        stage,
        status: "pending",
        startedAt: null,
        completedAt: null,
        note: null,
      };
      return acc;
    },
    {} as Record<PipelineStage, PipelineStageState>,
  );
}

export function buildEmptyMedia(): Record<MediaSlotKind, null> {
  return {
    camera_1: null,
    camera_2: null,
    mic_1: null,
    mic_2: null,
  };
}

export function countImportedMedia(
  media: PodcastProject["media"],
): number {
  return Object.values(media).filter((m) => m !== null).length;
}

export function countCompletedStages(
  pipeline: PodcastProject["pipeline"],
): number {
  return PIPELINE_STAGES.filter((s) => pipeline[s].status === "complete")
    .length;
}

export function pipelineProgressPct(
  pipeline: PodcastProject["pipeline"],
): number {
  return Math.round(
    (countCompletedStages(pipeline) / PIPELINE_STAGES.length) * 100,
  );
}

export function currentStage(
  pipeline: PodcastProject["pipeline"],
): PipelineStage {
  // First in_progress wins, else first pending, else last stage.
  const inProgress = PIPELINE_STAGES.find(
    (s) => pipeline[s].status === "in_progress",
  );
  if (inProgress) return inProgress;
  const pending = PIPELINE_STAGES.find((s) => pipeline[s].status === "pending");
  if (pending) return pending;
  return PIPELINE_STAGES[PIPELINE_STAGES.length - 1];
}
