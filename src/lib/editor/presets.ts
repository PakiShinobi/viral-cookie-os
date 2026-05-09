import type { ExportPreset } from "./types";

/**
 * Export presets that the future ffmpeg + Remotion pipeline will consume.
 * The editor only emits jobs against this surface — actual rendering is
 * out of scope for this iteration.
 */

export const EXPORT_PRESETS: readonly ExportPreset[] = [
  {
    id: "long_form_youtube",
    name: "Full episode · YouTube",
    aspect: "16:9",
    format: "mp4",
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    destination: "YouTube",
  },
  {
    id: "audio_mp3",
    name: "Audio episode · MP3",
    aspect: "16:9",
    format: "mp3",
    resolution: { width: 0, height: 0 },
    fps: null,
    destination: "Spotify · Apple · RSS",
  },
  {
    id: "vertical_short",
    name: "Vertical · YouTube Shorts",
    aspect: "9:16",
    format: "mp4",
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    destination: "YouTube Shorts",
  },
  {
    id: "vertical_reel",
    name: "Vertical · Instagram Reels",
    aspect: "9:16",
    format: "mp4",
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    destination: "Instagram Reels",
  },
  {
    id: "tiktok",
    name: "Vertical · TikTok",
    aspect: "9:16",
    format: "mp4",
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    destination: "TikTok",
  },
] as const;

export function presetById(
  id: string,
): ExportPreset | undefined {
  return EXPORT_PRESETS.find((p) => p.id === id);
}
