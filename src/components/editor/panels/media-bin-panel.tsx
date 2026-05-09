"use client";

import { formatBytes, formatDuration } from "@/lib/podcast/format";
import {
  addBinItem,
  removeBinItem,
} from "@/lib/podcast/services";
import { uploadMedia } from "@/lib/media/client";
import type { MediaBinItem, PodcastProject } from "@/lib/podcast/types";
import { useEditorStore } from "@/lib/editor/use-editor";
import { useProject } from "@/lib/podcast/use-podcast";
import {
  type ChangeEvent,
  type DragEvent,
  useId,
  useState,
} from "react";

/**
 * Media bin: lists all imported sources for the project. The user can:
 *   - import additional media (drag-drop or file picker)
 *   - drag a bin item onto the canvas/timeline (data set in dataTransfer)
 *   - click an item to add it at the playhead
 *   - remove an item (purges referencing clips)
 */

export function MediaBinPanel({
  project: initialProject,
}: {
  project: PodcastProject;
}) {
  const { project } = useProject(initialProject.id);
  const live = project ?? initialProject;
  const store = useEditorStore();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [hovering, setHovering] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    setBusy(true);
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      if (!isVideo && !isAudio) continue;
      const kind = isVideo ? "video" : "audio";
      try {
        const result = await uploadMedia({
          projectId: live.id,
          file,
          kind,
        });
        addBinItem(live.id, result, kind);
      } catch {
        // Errors surface in the per-slot card; the bin panel intentionally
        // stays minimal — a future enhancement can wire toast feedback here.
      }
    }
    setBusy(false);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }

  function onItemDragStart(e: DragEvent<HTMLDivElement>, item: MediaBinItem) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/x-vcos-media", item.id);
    e.dataTransfer.setData("text/plain", item.label);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHovering(true);
        }}
        onDragLeave={() => setHovering(false)}
        onDrop={onDrop}
        className={`mx-3 mt-3 flex flex-col gap-2 rounded-lg border border-dashed p-3 text-center transition-colors ${
          hovering
            ? "border-accent/50 bg-accent-subtle"
            : "border-border bg-surface-2/40"
        }`}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {busy ? "Uploading & probing…" : "Drop video or audio"}
        </p>
        <label
          htmlFor={inputId}
          className="cursor-pointer self-center rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-border-strong"
        >
          Browse files
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept="video/*,audio/*"
          className="sr-only"
          onChange={onChange}
        />
      </div>

      {/* Items */}
      <div className="mt-3 space-y-1.5 px-3 pb-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          Bin · {live.mediaBin.length}
        </p>
        {live.mediaBin.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface-2/40 px-3 py-4 text-center text-[12px] text-muted">
            Nothing imported yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {live.mediaBin.map((m) => (
              <BinRow
                key={m.id}
                item={m}
                onAddAtPlayhead={() => {
                  store.addClipFromBin(m, store.getState().playhead);
                }}
                onRemove={() => removeBinItem(live.id, m.id)}
                onDragStart={onItemDragStart}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BinRow({
  item,
  onAddAtPlayhead,
  onRemove,
  onDragStart,
}: {
  item: MediaBinItem;
  onAddAtPlayhead: () => void;
  onRemove: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, item: MediaBinItem) => void;
}) {
  return (
    <li>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item)}
        onDoubleClick={onAddAtPlayhead}
        className="group relative flex cursor-grab items-center gap-3 rounded-lg border border-border bg-surface px-2.5 py-2 transition-colors hover:border-border-strong active:cursor-grabbing"
      >
        <span
          className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md"
          style={{
            background: `linear-gradient(135deg, ${item.color}25, ${item.color}05)`,
            border: `1px solid ${item.color}55`,
          }}
        >
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <span
                className="font-mono text-[9px] font-medium uppercase tracking-[0.14em]"
                style={{ color: item.color }}
              >
                {item.kind === "video" ? "VID" : "AUD"}
              </span>
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-foreground">
            {item.label}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {formatDuration(item.durationSec)}
            <span className="px-1.5 text-border-strong">·</span>
            {formatBytes(item.fileSize)}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddAtPlayhead();
          }}
          title="Add at playhead"
          className="rounded-md border border-border bg-surface-2 px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted opacity-0 transition-all hover:border-border-strong hover:text-foreground group-hover:opacity-100"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Remove ${item.label} from bin?`)) onRemove();
          }}
          title="Remove from bin"
          className="rounded-md px-1.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted/70 opacity-0 transition-all hover:text-error group-hover:opacity-100"
        >
          ×
        </button>
      </div>
    </li>
  );
}
