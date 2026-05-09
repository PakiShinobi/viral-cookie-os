"use client";

import { formatPlayheadTime } from "@/lib/editor/timeline-math";
import { useEditorDoc, useEditorStore } from "@/lib/editor/use-editor";
import type {
  AudioClip,
  EditorClip,
  OverlayClip,
  Track,
  VideoClip,
} from "@/lib/editor/types";
import type { PodcastProject } from "@/lib/podcast/types";

/**
 * Inspector — right panel showing properties of the selected clip.
 *
 * Each clip kind has its own section:
 *   video   → transform (x/y/scale), reframing helpers, multicam group
 *   audio   → gain
 *   overlay → text + transform
 *   caption → text
 *
 * When nothing is selected we show the project meta + a hint.
 */

export function Inspector({ project }: { project: PodcastProject }) {
  const doc = useEditorDoc();
  const store = useEditorStore();

  const selected = doc.clips.find((c) => doc.selection.includes(c.id)) ?? null;
  const track = selected
    ? (doc.tracks.find((t) => t.id === selected.trackId) ?? null)
    : null;

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-border bg-surface">
      <header className="border-b border-border px-4 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          Inspector
        </p>
        <h2 className="mt-1 truncate text-[14px] font-semibold tracking-tight text-foreground">
          {selected ? clipKindLabel(selected) : "Project"}
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected ? (
          <ClipInspector
            clip={selected}
            track={track}
            project={project}
            onPatch={(patch) => store.patchClip(selected.id, patch)}
            onTrim={(edge, time) =>
              store.trimClip(selected.id, edge, time, true)
            }
            onSplit={() => store.splitClipAt(selected.id, doc.playhead)}
            onDelete={() => store.deleteClip(selected.id)}
            onRipple={() => store.rippleDelete(selected.id)}
            playhead={doc.playhead}
          />
        ) : (
          <ProjectInspector project={project} />
        )}
      </div>
    </aside>
  );
}

function ProjectInspector({ project }: { project: PodcastProject }) {
  const doc = useEditorDoc();
  return (
    <div className="space-y-4 p-4">
      <SectionLabel>Project</SectionLabel>
      <div className="space-y-1.5 font-mono text-[10px] uppercase tracking-[0.14em]">
        <Row
          label="Title"
          value={project.title}
          valueClass="text-foreground normal-case tracking-normal"
        />
        <Row label="Bin" value={`${project.mediaBin.length} sources`} />
        <Row label="Tracks" value={String(doc.tracks.length)} />
        <Row label="Clips" value={String(doc.clips.length)} />
        <Row label="Aspect" value={doc.aspect} valueClass="text-foreground" />
        <Row label="Duration" value={formatPlayheadTime(doc.duration)} />
      </div>

      <SectionLabel>Hint</SectionLabel>
      <p className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
        Select a clip on the timeline to inspect its transform, in/out, and
        text properties. Use S to split at the playhead, I/O to mark in/out.
      </p>
    </div>
  );
}

function ClipInspector({
  clip,
  track,
  project,
  onPatch,
  onTrim,
  onSplit,
  onDelete,
  onRipple,
  playhead,
}: {
  clip: EditorClip;
  track: Track | null;
  project: PodcastProject;
  onPatch: (p: Partial<EditorClip>) => void;
  onTrim: (edge: "left" | "right", time: number) => void;
  onSplit: () => void;
  onDelete: () => void;
  onRipple: () => void;
  playhead: number;
}) {
  const media =
    clip.kind === "video" || clip.kind === "audio"
      ? project.mediaBin.find((m) => m.id === clip.mediaId)
      : null;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="space-y-1.5">
        <SectionLabel>Source</SectionLabel>
        <p className="text-[12px] font-medium text-foreground">
          {clip.label ?? media?.label ?? clipKindLabel(clip)}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {track?.name ?? "—"}
          <span className="px-1.5 text-border-strong">·</span>
          {clip.kind}
        </p>
      </div>

      {/* Timing */}
      <div className="space-y-1.5">
        <SectionLabel>Timing</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Start"
            value={clip.start}
            onCommit={(v) => onTrim("left", Math.max(0, v))}
            unit="s"
          />
          <NumberField
            label="Length"
            value={clip.duration}
            onCommit={(v) =>
              onTrim("right", clip.start + Math.max(0.1, v))
            }
            unit="s"
          />
          <NumberField
            label="In"
            value={clip.inPoint}
            onCommit={(v) =>
              onPatch({ inPoint: Math.max(0, v) } as Partial<EditorClip>)
            }
            unit="s"
          />
          <NumberField
            label="End"
            value={clip.start + clip.duration}
            onCommit={(v) => onTrim("right", v)}
            unit="s"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <SmallButton
            onClick={onSplit}
            disabled={
              playhead <= clip.start || playhead >= clip.start + clip.duration
            }
          >
            Split @ {formatPlayheadTime(playhead)}
          </SmallButton>
          <SmallButton onClick={onRipple} tone="warning">
            Ripple del
          </SmallButton>
          <SmallButton onClick={onDelete} tone="error">
            Delete
          </SmallButton>
        </div>
      </div>

      {/* Per-kind properties */}
      {clip.kind === "video" && (
        <VideoProps clip={clip} onPatch={onPatch} />
      )}
      {clip.kind === "audio" && (
        <AudioProps clip={clip} onPatch={onPatch} />
      )}
      {clip.kind === "overlay" && (
        <OverlayProps clip={clip} onPatch={onPatch} />
      )}
      {clip.kind === "caption" && (
        <div className="space-y-1.5">
          <SectionLabel>Text</SectionLabel>
          <textarea
            value={clip.text}
            onChange={(e) =>
              onPatch({ text: e.target.value } as Partial<EditorClip>)
            }
            rows={3}
            className="block w-full resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-foreground placeholder:text-muted/70 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      )}
    </div>
  );
}

function VideoProps({
  clip,
  onPatch,
}: {
  clip: VideoClip;
  onPatch: (p: Partial<EditorClip>) => void;
}) {
  function setT(part: Partial<VideoClip["transform"]>) {
    onPatch({
      transform: { ...clip.transform, ...part },
    } as Partial<EditorClip>);
  }
  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <SectionLabel>Transform</SectionLabel>
          <button
            type="button"
            onClick={() =>
              setT({ x: 0, y: 0, scale: 1, rotation: 0 })
            }
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Pos X"
            value={clip.transform.x}
            onCommit={(v) => setT({ x: clamp(v, -1, 1) })}
            step={0.01}
          />
          <NumberField
            label="Pos Y"
            value={clip.transform.y}
            onCommit={(v) => setT({ y: clamp(v, -1, 1) })}
            step={0.01}
          />
          <NumberField
            label="Scale"
            value={clip.transform.scale}
            onCommit={(v) => setT({ scale: clamp(v, 0.25, 4) })}
            step={0.05}
          />
          <NumberField
            label="Rotation"
            value={clip.transform.rotation}
            onCommit={(v) => setT({ rotation: v })}
            unit="°"
            step={1}
          />
        </div>
        <div className="flex gap-1.5">
          <SmallButton onClick={() => setT({ scale: 1, x: 0, y: 0 })}>
            Fit 16:9
          </SmallButton>
          <SmallButton
            onClick={() => setT({ scale: 1.78, x: 0, y: 0 })}
            tone="accent"
          >
            Reframe 9:16
          </SmallButton>
        </div>
      </div>

      <div className="space-y-1.5">
        <SectionLabel>Multicam group</SectionLabel>
        <input
          value={clip.multicamGroup ?? ""}
          onChange={(e) =>
            onPatch({
              multicamGroup: e.target.value || null,
            } as Partial<EditorClip>)
          }
          placeholder="e.g. ep_47_main"
          className="block w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-[11px] text-foreground placeholder:text-muted/60 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <p className="text-[10px] leading-relaxed text-muted">
          Clips in the same group can be live-switched at export. Topmost
          track wins until a real switcher is wired up.
        </p>
      </div>
    </>
  );
}

function AudioProps({
  clip,
  onPatch,
}: {
  clip: AudioClip;
  onPatch: (p: Partial<EditorClip>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <SectionLabel>Audio</SectionLabel>
      <NumberField
        label="Gain"
        value={clip.gain}
        onCommit={(v) =>
          onPatch({ gain: Math.max(0, v) } as Partial<EditorClip>)
        }
        step={0.05}
      />
    </div>
  );
}

function OverlayProps({
  clip,
  onPatch,
}: {
  clip: OverlayClip;
  onPatch: (p: Partial<EditorClip>) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <SectionLabel>Text</SectionLabel>
        <input
          value={clip.text}
          onChange={(e) =>
            onPatch({ text: e.target.value } as Partial<EditorClip>)
          }
          className="block w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <input
          value={clip.subtext ?? ""}
          onChange={(e) =>
            onPatch({
              subtext: e.target.value || null,
            } as Partial<EditorClip>)
          }
          placeholder="Subtext (optional)"
          className="mt-1 block w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>
      <div className="space-y-1.5">
        <SectionLabel>Position</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Pos X"
            value={clip.transform.x}
            onCommit={(v) =>
              onPatch({
                transform: {
                  ...clip.transform,
                  x: clamp(v, -1, 1),
                },
              } as Partial<EditorClip>)
            }
            step={0.01}
          />
          <NumberField
            label="Pos Y"
            value={clip.transform.y}
            onCommit={(v) =>
              onPatch({
                transform: {
                  ...clip.transform,
                  y: clamp(v, -1, 1),
                },
              } as Partial<EditorClip>)
            }
            step={0.01}
          />
        </div>
      </div>
    </>
  );
}

/* ---------- helpers ---------- */

function clipKindLabel(c: EditorClip): string {
  if (c.kind === "overlay") {
    switch (c.overlayKind) {
      case "lower_third":
        return "Lower third";
      case "sponsor_card":
        return "Sponsor card";
      case "subscribe_cta":
        return "Subscribe CTA";
      case "title_card":
        return "Title card";
    }
  }
  return c.kind === "video"
    ? "Video clip"
    : c.kind === "audio"
      ? "Audio clip"
      : "Caption";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function NumberField({
  label,
  value,
  onCommit,
  unit,
  step = 0.1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  unit?: string;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <div className="mt-1 flex items-center rounded-md border border-border bg-surface-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        <input
          type="number"
          step={step}
          defaultValue={Number(value.toFixed(3))}
          key={value}
          onBlur={(e) => onCommit(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-full bg-transparent px-2 py-1 font-mono text-[12px] tabular-nums text-foreground outline-none"
        />
        {unit && (
          <span className="px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "warning" | "error" | "accent";
}) {
  const palette =
    tone === "error"
      ? "hover:border-error/40 hover:text-error"
      : tone === "warning"
        ? "hover:border-warning/40 hover:text-warning"
        : tone === "accent"
          ? "hover:border-accent/50 hover:text-accent"
          : "hover:border-border-strong hover:text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors disabled:opacity-50 ${palette}`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
      {children}
    </p>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={valueClass ?? "text-foreground"}>{value}</dd>
    </div>
  );
}
