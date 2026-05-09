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
  | "extract_audio"
  | "waveform"
  | "process_media"
  | "sync_analyze"
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
  /**
   * Asynchronously-running post-import job (audio extraction + waveform).
   * Null when the source had nothing extractable (no audio stream).
   */
  processingJobId: string | null;
}

/* ===============================
   Audio + Waveform foundation
================================ */

/**
 * Persisted summary of an extracted PCM stream. Lives next to the WAV
 * file (`audio.json`) so we can answer questions like "is the audio
 * track mono?" without re-reading the WAV.
 */
export interface ExtractedAudioInfo {
  path: string;
  format: "pcm_s16le";
  sampleRate: number;
  channels: number;
  durationSec: number | null;
  sizeBytes: number;
}

/**
 * Compact waveform peaks for timeline rendering.
 *
 * `peaks` is an interleaved [min, max, min, max, ...] array of values
 * normalised to -1..1. Each (min, max) pair represents one bucket of
 * `1 / peaksPerSecond` seconds of audio.
 *
 * The format is intentionally JSON — it streams cleanly through the
 * existing API surface, browsers parse it natively, and the file size
 * (~250 KB / hour at 50 buckets/s) is acceptable.
 */
export interface WaveformData {
  /** Schema version. Bump when shape changes. */
  version: 1;
  itemId: string;
  channels: number;
  sampleRate: number;
  durationSec: number;
  peaksPerSecond: number;
  peakCount: number;
  peaks: number[];
}

/**
 * Lightweight pointer the client uses without re-fetching the whole
 * peaks payload. Held on the MediaBinItem.
 */
export interface WaveformSummary {
  peaksPerSecond: number;
  peakCount: number;
  durationSec: number;
}

/**
 * Result of aligning two audio sources.
 *
 * `offsetSec` is positive when source B starts AFTER source A — i.e.
 * to align them on the timeline you would pull B forward by this much.
 *
 * `confidence` is normalised to 0..1 and reflects how sharp the
 * cross-correlation peak is relative to the surrounding noise floor.
 * A confidence below ~0.25 should be treated as "no reliable lock".
 */
export interface SyncEstimate {
  offsetSec: number;
  confidence: number;
  /** What we ran. Future: "phase_xcorr", "transient_match", etc. */
  method: "peak_xcorr";
  /** Half-window of lags considered, in seconds. */
  searchWindowSec: number;
  /** Diagnostic only; raw correlation peak / mean magnitude. */
  peakRatio: number;
}

export type SyncStatus =
  | "not_run"
  | "running"
  | "ok"
  | "low_confidence"
  | "failed";

/**
 * Per-pair record persisted on the project so the editor can show sync
 * diagnostics without re-running the analysis.
 */
export interface SyncRecord {
  id: string;
  /** Reference / anchor source. Other items align to this one. */
  referenceItemId: string;
  /** Source being aligned. */
  candidateItemId: string;
  status: SyncStatus;
  estimate: SyncEstimate | null;
  error: string | null;
  computedAt: string;
}
