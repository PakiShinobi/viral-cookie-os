"use client";

import { formatBytes, formatDuration } from "@/lib/podcast/format";
import { MEDIA_SLOTS } from "@/lib/podcast/pipeline";
import {
  attachMedia,
  probeMediaDuration,
  removeMedia,
} from "@/lib/podcast/services";
import type { MediaAsset, MediaSlotKind } from "@/lib/podcast/types";
import {
  type DragEvent,
  type ChangeEvent,
  useId,
  useRef,
  useState,
} from "react";

/**
 * MediaSlot — one of the four import slots.
 *
 * Empty state shows a dashed bordered drop zone with file picker.
 * Filled state shows file metadata and a "remove" affordance.
 *
 * Files are stored as metadata only (filename, size, duration). Real bytes
 * stay on the user's disk — the importer hands them to whatever processor
 * runs the next stage.
 */

const slotMeta = MEDIA_SLOTS.reduce(
  (acc, m) => {
    acc[m.slot] = m;
    return acc;
  },
  {} as Record<MediaSlotKind, (typeof MEDIA_SLOTS)[number]>,
);

export function MediaSlot({
  projectId,
  slot,
  asset,
}: {
  projectId: string;
  slot: MediaSlotKind;
  asset: MediaAsset | null;
}) {
  const meta = slotMeta[slot];
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    const duration = await probeMediaDuration(file, meta.trackType);
    attachMedia(projectId, slot, file, meta.trackType, duration);
    setBusy(false);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setHovering(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  if (asset) {
    return (
      <div className="group relative flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlotGlyph trackType={meta.trackType} />
            <div className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              {meta.shortLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeMedia(projectId, slot)}
            className="rounded-md border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted opacity-0 transition-all hover:border-border-strong hover:text-foreground group-hover:opacity-100"
          >
            Replace
          </button>
        </div>

        <div className="space-y-1">
          <p
            className="truncate text-[13px] font-medium text-foreground"
            title={asset.fileName}
          >
            {asset.fileName}
          </p>
          <p className="font-mono text-[11px] text-muted">
            {formatBytes(asset.fileSize)}
            <span className="px-1.5 text-border-strong">·</span>
            {formatDuration(asset.durationSec)}
          </p>
        </div>

        <WaveformGlyph trackType={meta.trackType} />
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={onDrop}
      className={`relative flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed p-4 transition-colors ${
        hovering
          ? "border-accent/60 bg-accent-subtle"
          : "border-border bg-surface/40 hover:border-border-strong hover:bg-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlotGlyph trackType={meta.trackType} muted />
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            {meta.shortLabel}
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted/70">
          {meta.trackType === "video" ? "MP4 / MOV" : "WAV / MP3"}
        </span>
      </div>

      <div className="space-y-0.5">
        <p className="text-[13px] font-medium text-foreground">{meta.label}</p>
        <p className="text-[11px] text-muted">{meta.hint}</p>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/70">
        {busy ? "Reading metadata…" : "Drop file or click to import"}
      </p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={meta.accept}
        className="sr-only"
        onChange={onChange}
        disabled={busy}
      />
    </label>
  );
}

function SlotGlyph({
  trackType,
  muted = false,
}: {
  trackType: "video" | "audio";
  muted?: boolean;
}) {
  const cls = muted
    ? "text-muted"
    : trackType === "video"
      ? "text-accent"
      : "text-success";
  if (trackType === "video") {
    return (
      <svg
        className={cls}
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
      >
        <rect
          x="1"
          y="3"
          width="9"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M10 6.5L13 5V9L10 7.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className={cls}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <rect
        x="5"
        y="1.5"
        width="4"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M2.5 7C2.5 9.485 4.515 11.5 7 11.5C9.485 11.5 11.5 9.485 11.5 7M7 11.5V13"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WaveformGlyph({ trackType }: { trackType: "video" | "audio" }) {
  // A static, gentle waveform — purely decorative, communicates "media here".
  const heights =
    trackType === "video"
      ? [3, 6, 5, 8, 4, 7, 5, 9, 4, 6, 5, 7, 4, 5, 6, 5, 7, 4, 6, 5]
      : [4, 7, 5, 9, 6, 8, 5, 9, 7, 6, 8, 5, 9, 6, 4, 7, 5, 8, 6, 5];
  return (
    <div className="flex h-6 items-end gap-[2px]">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full ${
            trackType === "video" ? "bg-accent/60" : "bg-success/60"
          }`}
          style={{ height: `${(h / 10) * 100}%` }}
        />
      ))}
    </div>
  );
}
