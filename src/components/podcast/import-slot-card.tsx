"use client";

import {
  addBinItem,
  patchBinItem,
  removeBinItem,
} from "@/lib/podcast/services";
import {
  pollJob,
  uploadMedia,
  type UploadProgress,
} from "@/lib/media/client";
import { formatBytes, formatDuration } from "@/lib/podcast/format";
import type {
  MediaBinItem,
  MediaSlotKind,
  PodcastProject,
} from "@/lib/podcast/types";
import {
  type ChangeEvent,
  type DragEvent,
  useId,
  useRef,
  useState,
} from "react";

/**
 * One of the four canonical import slots.
 *
 * Lifecycle:
 *   empty -> uploading (with progress) -> processing (probe + thumb)
 *     -> filled (thumbnail + metadata) -> remove restarts
 *
 * Any failure surfaces inline; the slot stays usable.
 *
 * Slot ↔ track-type contract:
 *   camera_*   accept video/*
 *   mic_*      accept audio/*
 *
 * Files dropped into the wrong slot are filtered with a friendly error.
 */

interface ImportSlotMeta {
  slot: MediaSlotKind;
  label: string;
  shortLabel: string;
  trackType: "video" | "audio";
  accept: string;
  hint: string;
  required: boolean;
}

export interface ImportSlotCardProps {
  project: PodcastProject;
  slotMeta: ImportSlotMeta;
}

export function ImportSlotCard({ project, slotMeta }: ImportSlotCardProps) {
  const inputId = useId();
  const item = project.mediaBin.find((m) => m.slotHint === slotMeta.slot) ?? null;

  const [hovering, setHovering] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isVideoSlot = slotMeta.trackType === "video";
  const accept = isVideoSlot ? "video/*" : "audio/*";

  async function startUpload(file: File) {
    const looksRight = isVideoSlot
      ? file.type.startsWith("video/")
      : file.type.startsWith("audio/");
    if (!looksRight && file.type !== "") {
      setError(
        isVideoSlot
          ? "This slot expects a video file."
          : "This slot expects an audio file.",
      );
      return;
    }

    setError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setProgress({
      phase: "uploading",
      uploaded: 0,
      loaded: 0,
      total: file.size,
    });

    try {
      const result = await uploadMedia({
        projectId: project.id,
        file,
        kind: slotMeta.trackType,
        signal: controller.signal,
        onProgress: setProgress,
      });
      addBinItem(project.id, result, slotMeta.trackType, {
        slotHint: slotMeta.slot,
      });
      if (result.processingJobId) {
        // Don't await — let the user keep working while processing runs.
        void watchProcessingJob(project.id, result.itemId, result.processingJobId);
      }
    } catch (err) {
      const e = err as Error;
      if (e.name !== "AbortError") setError(e.message || "Upload failed");
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void startUpload(f);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setHovering(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void startUpload(f);
  }

  function onRemove() {
    abortRef.current?.abort();
    if (item) removeBinItem(project.id, item.id);
    setError(null);
    setProgress(null);
  }

  // Filled state — show thumbnail + metadata.
  if (item && !progress) {
    return (
      <FilledSlot
        item={item}
        meta={slotMeta}
        onRemove={onRemove}
        onReplace={() => {
          // Trigger the hidden picker for this slot.
          (document.getElementById(inputId) as HTMLInputElement | null)?.click();
        }}
        inputId={inputId}
        accept={accept}
        onChange={onChange}
      />
    );
  }

  // Active upload state — render progress on top of the dashed zone.
  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={onDrop}
      className={`group relative flex h-full min-h-[220px] cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border-2 border-dashed p-5 transition-colors ${
        hovering
          ? "border-accent/60 bg-accent-subtle"
          : slotMeta.required
            ? "border-border-strong bg-surface/60 hover:border-border-strong hover:bg-surface"
            : "border-border bg-surface/40 hover:border-border-strong hover:bg-surface"
      }`}
    >
      <SlotHeader meta={slotMeta} />

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {progress ? (
          <UploadProgressView progress={progress} />
        ) : (
          <>
            <DropGlyph
              hovering={hovering}
              kind={slotMeta.trackType}
            />
            <div>
              <p className="text-[13px] font-medium text-foreground">
                {hovering ? "Drop file" : "Drop or browse"}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {slotMeta.hint}
              </p>
            </div>
          </>
        )}
      </div>

      {error ? (
        <p className="rounded-md border border-error/30 bg-error/10 px-2 py-1 text-[11px] text-error">
          {error}
        </p>
      ) : null}

      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onChange}
        disabled={progress !== null}
      />
    </label>
  );
}

/**
 * Poll the post-import processing job. When it succeeds, patch the bin
 * item with the resolved audio + waveform metadata so downstream
 * components (timeline waveform render, sync analysis) can use it.
 *
 * Errors are written onto the bin item rather than thrown so the slot
 * card can surface a friendly retry path later.
 */
async function watchProcessingJob(
  projectId: string,
  itemId: string,
  jobId: string,
): Promise<void> {
  try {
    const job = await pollJob(jobId, {
      onTick: (j) => {
        if (j.status !== "running") return;
        // Translate progress thresholds back into UI-readable states.
        const state =
          j.progress < 0.5 ? "extracting_audio" : "waveform";
        patchBinItem(projectId, itemId, {
          processingState: state,
        });
      },
    });
    if (job.status === "succeeded") {
      const r = (job.result ?? {}) as {
        audioReady?: boolean;
        audioUrl?: string | null;
        waveformReady?: boolean;
        waveformUrl?: string | null;
        waveform?: {
          peaksPerSecond: number;
          peakCount: number;
          durationSec: number;
        } | null;
      };
      patchBinItem(projectId, itemId, {
        audioReady: !!r.audioReady,
        audioUrl: r.audioUrl ?? null,
        waveformReady: !!r.waveformReady,
        waveformUrl: r.waveformUrl ?? null,
        waveform: r.waveform ?? null,
        processingJobId: null,
        processingState: r.waveformReady && r.audioReady ? "ready" : "failed",
        processingError: r.waveformReady && r.audioReady ? null : "Processing incomplete",
      });
    } else {
      patchBinItem(projectId, itemId, {
        processingJobId: null,
        processingState: "failed",
        processingError: job.error ?? "Processing failed",
      });
    }
  } catch (e) {
    patchBinItem(projectId, itemId, {
      processingJobId: null,
      processingState: "failed",
      processingError: (e as Error).message,
    });
  }
}

function FilledSlot({
  item,
  meta,
  inputId,
  accept,
  onChange,
  onRemove,
  onReplace,
}: {
  item: MediaBinItem;
  meta: ImportSlotMeta;
  inputId: string;
  accept: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const probe = item.probe;
  return (
    <div
      className="group relative flex h-full min-h-[220px] flex-col gap-3 overflow-hidden rounded-2xl border bg-surface p-5 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset,0_8px_24px_rgba(0,0,0,0.18)]"
      style={{ borderColor: `${item.color}60` }}
    >
      <SlotHeader meta={meta} filled />

      <div className="relative -mx-5 -mt-1 aspect-[16/9] overflow-hidden border-y border-border bg-black">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.label}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <AudioBg color={item.color} />
        )}

        <div
          className="absolute left-3 top-3 rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] backdrop-blur"
          style={{
            background: "rgba(0,0,0,0.45)",
            borderColor: `${item.color}80`,
            color: item.color,
          }}
        >
          {meta.shortLabel} · {item.kind === "video" ? "VIDEO" : "AUDIO"}
        </div>

        {probe?.durationSec ? (
          <div className="absolute bottom-3 right-3 rounded-md border border-border bg-black/60 px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground backdrop-blur">
            {formatDuration(probe.durationSec)}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">
          {item.label}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {[
            probe?.videoCodec ?? probe?.audioCodec ?? "—",
            probe?.width && probe?.height
              ? `${probe.width}×${probe.height}`
              : null,
            probe?.fps ? `${probe.fps}fps` : null,
            probe?.audioChannels ? `${probe.audioChannels}ch` : null,
            formatBytes(item.fileSize),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onReplace}
          className="rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted/70 transition-colors hover:bg-surface-2 hover:text-error"
        >
          Remove
        </button>
      </div>

      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onChange}
      />
    </div>
  );
}

function SlotHeader({
  meta,
  filled,
}: {
  meta: ImportSlotMeta;
  filled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          {meta.shortLabel}
        </p>
        <p className="text-[13px] font-medium text-foreground">{meta.label}</p>
      </div>
      <span
        className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
          meta.required
            ? filled
              ? "border-success/40 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
            : filled
              ? "border-success/30 bg-success/5 text-success"
              : "border-border bg-surface-2 text-muted"
        }`}
      >
        {meta.required ? (filled ? "Ready" : "Required") : filled ? "Set" : "Optional"}
      </span>
    </div>
  );
}

function UploadProgressView({ progress }: { progress: UploadProgress }) {
  const pct =
    progress.phase === "processing" ? 1 : progress.uploaded ?? 0;
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative h-1 w-3/4 overflow-hidden rounded-full bg-surface-2">
        <div
          className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-200"
          style={{
            width:
              progress.phase === "processing"
                ? "100%"
                : `${Math.round(pct * 100)}%`,
          }}
        />
        {progress.phase === "processing" ? (
          <div className="absolute inset-y-0 left-0 w-1/3 animate-scan bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        ) : null}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {progress.phase === "processing"
          ? "Probing media…"
          : progress.uploaded !== null
            ? `Uploading · ${Math.round(pct * 100)}%`
            : "Uploading…"}
      </p>
      <p className="font-mono text-[10px] tabular-nums text-muted/80">
        {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
      </p>
    </div>
  );
}

function DropGlyph({
  hovering,
  kind,
}: {
  hovering: boolean;
  kind: "video" | "audio";
}) {
  if (kind === "audio") {
    return (
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        aria-hidden
        className={hovering ? "text-accent" : "text-muted"}
      >
        {[6, 12, 18, 24, 30].map((x, i) => {
          const h = [10, 22, 32, 18, 12][i];
          return (
            <rect
              key={x}
              x={x - 1.5}
              y={20 - h / 2}
              width={3}
              height={h}
              rx={1.5}
              fill="currentColor"
              opacity={0.8}
            />
          );
        })}
      </svg>
    );
  }
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      aria-hidden
      className={hovering ? "text-accent" : "text-muted"}
    >
      <rect
        x="5"
        y="10"
        width="30"
        height="20"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeDasharray="3 2"
      />
      <path
        d="M20 6V22M20 6L15.5 11M20 6L24.5 11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AudioBg({ color }: { color: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${color}30, ${color}05 60%, #00000080 100%)`,
      }}
    >
      <svg width="120" height="40" viewBox="0 0 120 40" aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => {
          const seed = (i * 17 + 5) % 100;
          const h = 6 + (seed % 28);
          return (
            <rect
              key={i}
              x={i * 4 + 2}
              y={20 - h / 2}
              width="2"
              height={h}
              rx="1"
              fill={color}
              opacity={0.6}
            />
          );
        })}
      </svg>
    </div>
  );
}
