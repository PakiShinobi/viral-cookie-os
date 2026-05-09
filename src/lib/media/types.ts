/**
 * Server-side media foundation — types.
 *
 * The media subsystem is local-first and replaceable. Files live on disk
 * under a configurable media root (`data/media/` by default). Lightweight
 * metadata (probe summary, stable storage keys, preview URLs) flows back
 * to the browser and is persisted alongside the project state.
 *
 * No type defined here is bound to a specific runtime — the same shapes
 * are reused by future async pipelines (sync, full episode render, MP3
 * export, 9:16 clip generation) once they replace the synchronous import
 * flow.
 */

/** Raw ffprobe payload — kept verbatim alongside the source file. */
export interface RawProbe {
  format?: {
    filename?: string;
    nb_streams?: number;
    format_name?: string;
    format_long_name?: string;
    duration?: string;
    size?: string;
    bit_rate?: string;
    probe_score?: number;
    tags?: Record<string, string>;
  };
  streams?: Array<{
    index?: number;
    codec_name?: string;
    codec_long_name?: string;
    codec_type?: "video" | "audio" | "subtitle" | "data";
    width?: number;
    height?: number;
    pix_fmt?: string;
    r_frame_rate?: string;
    avg_frame_rate?: string;
    bit_rate?: string;
    duration?: string;
    sample_rate?: string;
    channels?: number;
    channel_layout?: string;
  }>;
}

export interface ProbeResultVideo {
  codec: string;
  width: number;
  height: number;
  fps: number;
  pixFmt: string;
  bitRate: number | null;
}

export interface ProbeResultAudio {
  codec: string;
  channels: number;
  sampleRate: number;
  channelLayout: string;
  bitRate: number | null;
}

/** Normalised probe shape used by the rest of the system. */
export interface ProbeResult {
  raw: RawProbe;
  format: {
    name: string;
    durationSec: number | null;
    sizeBytes: number;
    bitRate: number | null;
  };
  video: ProbeResultVideo | null;
  audio: ProbeResultAudio[];
}

/** Slim summary persisted to project state. */
export interface ProbeSummary {
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

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type JobKind =
  | "import"
  | "probe"
  | "thumbnail"
  | "sync"
  | "render_full"
  | "export_mp3"
  | "make_clip";

export interface MediaJob {
  id: string;
  projectId: string;
  itemId: string | null;
  kind: JobKind;
  status: JobStatus;
  /** 0..1 inclusive. */
  progress: number;
  message: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  /** Free-form payload set when status reaches `succeeded`. */
  result: unknown;
}

export interface MediaImportResult {
  itemId: string;
  storageKey: string;
  previewUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  probe: ProbeSummary | null;
}
