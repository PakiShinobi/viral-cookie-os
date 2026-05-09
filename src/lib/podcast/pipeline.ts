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
export const PIPELINE_STAGE_META: Record<PipelineStage, PipelineStageMeta> = {
  imported: {
    stage: "imported",
    number: 1,
    label: "Imported",
    shortLabel: "Import",
    description: "Bring all source media into the project.",
    checklist: [
      "Camera 1 footage uploaded",
      "Camera 2 footage uploaded",
      "Mic 1 audio uploaded",
      "Mic 2 audio uploaded",
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
    label: "Synced",
    shortLabel: "Sync",
    description:
      "Align mic audio to camera tracks and lock the master timeline.",
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
    label: "Full Episode",
    shortLabel: "Edit",
    description:
      "Assemble the full episode: switching, sponsors, name cards, CTAs.",
    checklist: [
      "Trim start and end",
      "Camera switching pass",
      "Sponsor ad insertion",
      "Namecards and lower thirds",
      "Subscribe CTA overlays",
    ],
    action: {
      id: "create_full_episode",
      label: "Create Full Episode",
      runningLabel: "Assembling episode",
    },
    targets: ["youtube"],
  },
  audio_export: {
    stage: "audio_export",
    number: 4,
    label: "Audio Episode",
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
      "Scan the episode for hook moments and generate 9:16 reels.",
    checklist: [
      "Scan transcript for hook moments",
      "Generate clip suggestions up to 60s",
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
    label: "Ready to Publish",
    shortLabel: "Publish",
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
}> = [
  {
    slot: "camera_1",
    label: "Camera 1",
    shortLabel: "CAM 1",
    trackType: "video",
    accept: "video/*",
    hint: "Primary host camera",
  },
  {
    slot: "camera_2",
    label: "Camera 2",
    shortLabel: "CAM 2",
    trackType: "video",
    accept: "video/*",
    hint: "Guest / B-roll camera",
  },
  {
    slot: "mic_1",
    label: "Mic 1",
    shortLabel: "MIC 1",
    trackType: "audio",
    accept: "audio/*",
    hint: "Host microphone",
  },
  {
    slot: "mic_2",
    label: "Mic 2",
    shortLabel: "MIC 2",
    trackType: "audio",
    accept: "audio/*",
    hint: "Guest microphone",
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
