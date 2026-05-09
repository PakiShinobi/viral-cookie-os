"use client";

import { generateId } from "@/lib/podcast/services";
import {
  buildDefaultEditorDoc,
  clipForMedia,
  makeOverlayClip,
} from "./factories";
import { clampZoom, hasOverlap, snapTime } from "./timeline-math";
import type {
  AspectRatio,
  EditorClip,
  EditorDoc,
  ExportPresetId,
  Marker,
  MarkerKind,
  MediaBinItem,
  OverlayClip,
  OverlayKind,
  TrimEdge,
  ViralClipRegion,
} from "./types";

/**
 * EditorStore — central, observable mutable state for the editor.
 *
 * Why a hand-rolled class:
 *   - useReducer / useState don't compose well with the high-frequency
 *     drag-trim-split pointer streams we need.
 *   - We get a single, narrow surface that React subscribes to via
 *     useSyncExternalStore, plus a stable mutator API for the UI.
 *   - The store is intentionally agnostic about persistence and rendering.
 *     A separate adapter (`use-editor.ts`) wires autosave to the project
 *     storage, and rendering is the future ffmpeg/Remotion job runner.
 */

type Listener = () => void;

export interface SnapHint {
  time: number;
  target: "playhead" | "clip-edge" | "marker" | "in" | "out";
}

export class EditorStore {
  private state: EditorDoc;
  private listeners = new Set<Listener>();
  /**
   * Last successful snap during a drag/trim. Cleared when no drag is active
   * or no snap occurred. Used to render a guide line on the timeline.
   */
  private snapHint: SnapHint | null = null;
  /**
   * Ephemeral playback state — never persisted to the project. The editor
   * boots paused; transport methods flip this and drive the audio/video
   * playback engine in the shell.
   */
  private playing = false;

  constructor(initial: EditorDoc) {
    this.state = initial;
  }

  /* ---------- Subscription ---------- */

  getState = (): EditorDoc => this.state;
  getSnapHint = (): SnapHint | null => this.snapHint;
  getIsPlaying = (): boolean => this.playing;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  private commit(next: EditorDoc) {
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  private setSnapHint(hint: SnapHint | null) {
    this.snapHint = hint;
    // Snap hint changes don't change the doc, but the timeline subscribes
    // to store ticks, so emit a notify.
    this.listeners.forEach((l) => l());
  }

  /* ---------- Transport ---------- */

  setPlayhead = (time: number): void => {
    const t = Math.max(0, time);
    if (t === this.state.playhead) return;
    this.commit({ ...this.state, playhead: t });
  };

  play = (): void => {
    if (this.playing) return;
    this.playing = true;
    this.listeners.forEach((l) => l());
  };

  pause = (): void => {
    if (!this.playing) return;
    this.playing = false;
    this.listeners.forEach((l) => l());
  };

  togglePlay = (): void => {
    if (this.playing) this.pause();
    else this.play();
  };

  setZoom = (zoom: number): void => {
    const z = clampZoom(zoom);
    if (z === this.state.zoom) return;
    this.commit({ ...this.state, zoom: z });
  };

  setAspect = (aspect: AspectRatio): void => {
    if (aspect === this.state.aspect) return;
    this.commit({ ...this.state, aspect });
  };

  toggleSnap = (): void => {
    this.commit({ ...this.state, snapEnabled: !this.state.snapEnabled });
  };

  /* ---------- Selection ---------- */

  selectClips = (ids: string[]): void => {
    this.commit({ ...this.state, selection: [...new Set(ids)] });
  };

  toggleClipSelection = (id: string, additive: boolean): void => {
    const cur = new Set(this.state.selection);
    if (additive) {
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
    } else {
      cur.clear();
      cur.add(id);
    }
    this.commit({ ...this.state, selection: [...cur] });
  };

  clearSelection = (): void => {
    if (this.state.selection.length === 0) return;
    this.commit({ ...this.state, selection: [] });
  };

  /* ---------- Tracks ---------- */

  setTrackMuted = (trackId: string, muted: boolean): void => {
    const tracks = this.state.tracks.map((t) =>
      t.id === trackId ? { ...t, muted } : t,
    );
    this.commit({ ...this.state, tracks });
  };

  setTrackSolo = (trackId: string, solo: boolean): void => {
    const tracks = this.state.tracks.map((t) =>
      t.id === trackId ? { ...t, solo } : t,
    );
    this.commit({ ...this.state, tracks });
  };

  setTrackLocked = (trackId: string, locked: boolean): void => {
    const tracks = this.state.tracks.map((t) =>
      t.id === trackId ? { ...t, locked } : t,
    );
    this.commit({ ...this.state, tracks });
  };

  /* ---------- Clip operations ---------- */

  /** Insert a pre-built clip onto its target track. Use for captions / overlays
   * created externally; bin-driven inserts should use addClipFromBin. */
  addClip = (clip: EditorClip): EditorClip => {
    let start = clip.start;
    while (
      hasOverlap(this.state.clips, clip.trackId, start, start + clip.duration, null)
    ) {
      start += 0.25;
    }
    const placed = { ...clip, start } as EditorClip;
    this.commit({
      ...this.state,
      clips: [...this.state.clips, placed],
      duration: Math.max(this.state.duration, start + placed.duration + 1),
      selection: [placed.id],
    });
    return placed;
  };

  addClipFromBin = (
    media: MediaBinItem,
    dropTime: number,
  ): EditorClip | null => {
    const r = clipForMedia(this.state, media, Math.max(0, dropTime));
    if (!r) return null;
    // Avoid hard overlaps — push to the right of any existing content.
    let start = r.clip.start;
    while (
      hasOverlap(this.state.clips, r.trackId, start, start + r.clip.duration, null)
    ) {
      start += 0.5;
    }
    const clip = { ...r.clip, start };
    const next: EditorDoc = {
      ...this.state,
      clips: [...this.state.clips, clip],
      duration: Math.max(this.state.duration, start + clip.duration + 5),
      selection: [clip.id],
    };
    this.commit(next);
    return clip;
  };

  /** Move a clip on its track. Honours snapping. */
  moveClip = (id: string, deltaSec: number, isFinal: boolean): void => {
    const clip = this.state.clips.find((c) => c.id === id);
    if (!clip) return;
    const proposed = Math.max(0, clip.start + deltaSec);
    const snap = snapTime(this.state, proposed, [id]);
    const start = snap.time;
    const end = start + clip.duration;
    if (
      hasOverlap(this.state.clips, clip.trackId, start, end, id) &&
      isFinal
    ) {
      // Reject overlap on commit; leave preview as-is.
      this.setSnapHint(null);
      return;
    }
    const clips = this.state.clips.map((c) =>
      c.id === id ? { ...c, start } : c,
    );
    this.commit({
      ...this.state,
      clips,
      duration: Math.max(this.state.duration, end + 1),
    });
    this.setSnapHint(
      snap.snapped && snap.target ? { time: start, target: snap.target } : null,
    );
    if (isFinal) this.setSnapHint(null);
  };

  /** Drag a clip's left or right edge to trim. */
  trimClip = (
    id: string,
    edge: TrimEdge,
    newTime: number,
    isFinal: boolean,
  ): void => {
    const clip = this.state.clips.find((c) => c.id === id);
    if (!clip) return;
    const minDur = 0.1;
    const snap = snapTime(this.state, newTime, [id]);
    const t = snap.time;

    let start = clip.start;
    let duration = clip.duration;
    let inPoint = clip.inPoint;
    if (edge === "left") {
      const maxStart = clip.start + clip.duration - minDur;
      const newStart = Math.min(maxStart, Math.max(0, t));
      const delta = newStart - clip.start;
      start = newStart;
      duration = clip.duration - delta;
      inPoint = Math.max(0, clip.inPoint + delta);
    } else {
      const minEnd = clip.start + minDur;
      const newEnd = Math.max(minEnd, t);
      duration = newEnd - clip.start;
    }

    const end = start + duration;
    if (
      hasOverlap(this.state.clips, clip.trackId, start, end, id) &&
      isFinal
    ) {
      this.setSnapHint(null);
      return;
    }
    const clips = this.state.clips.map((c) =>
      c.id === id ? ({ ...c, start, duration, inPoint } as EditorClip) : c,
    );
    this.commit({
      ...this.state,
      clips,
      duration: Math.max(this.state.duration, end + 1),
    });
    this.setSnapHint(
      snap.snapped && snap.target ? { time: t, target: snap.target } : null,
    );
    if (isFinal) this.setSnapHint(null);
  };

  /** Split a clip at the given timeline time. Yields two clips. */
  splitClipAt = (clipId: string, time: number): void => {
    const clip = this.state.clips.find((c) => c.id === clipId);
    if (!clip) return;
    if (time <= clip.start || time >= clip.start + clip.duration) return;
    const offset = time - clip.start;
    const right: EditorClip = {
      ...clip,
      id: generateId("clip"),
      start: time,
      duration: clip.duration - offset,
      inPoint: clip.inPoint + offset,
    };
    const left: EditorClip = { ...clip, duration: offset };
    const clips: EditorClip[] = this.state.clips
      .map((c) => (c.id === clipId ? left : c))
      .concat(right);
    this.commit({ ...this.state, clips, selection: [right.id] });
  };

  /**
   * Split every clip under the playhead. Useful keyboard shortcut: 'S'.
   */
  splitAtPlayhead = (): void => {
    const t = this.state.playhead;
    const toSplit = this.state.clips.filter(
      (c) => c.start < t && t < c.start + c.duration,
    );
    if (toSplit.length === 0) return;
    let next = this.state;
    for (const c of toSplit) {
      const offset = t - c.start;
      const right: EditorClip = {
        ...c,
        id: generateId("clip"),
        start: t,
        duration: c.duration - offset,
        inPoint: c.inPoint + offset,
      };
      const left: EditorClip = { ...c, duration: offset };
      next = {
        ...next,
        clips: next.clips.map((x) => (x.id === c.id ? left : x)).concat(right),
      };
    }
    this.commit(next);
  };

  deleteClip = (id: string): void => {
    const clips = this.state.clips.filter((c) => c.id !== id);
    const selection = this.state.selection.filter((s) => s !== id);
    this.commit({ ...this.state, clips, selection });
  };

  /**
   * Delete a clip and pull subsequent clips on the same track to the left
   * by the removed gap.
   */
  rippleDelete = (id: string): void => {
    const clip = this.state.clips.find((c) => c.id === id);
    if (!clip) return;
    const removedEnd = clip.start + clip.duration;
    const clips = this.state.clips
      .filter((c) => c.id !== id)
      .map((c) => {
        if (c.trackId !== clip.trackId) return c;
        if (c.start >= removedEnd) {
          return { ...c, start: c.start - clip.duration };
        }
        return c;
      });
    const selection = this.state.selection.filter((s) => s !== id);
    this.commit({ ...this.state, clips, selection });
  };

  deleteSelection = (): void => {
    if (this.state.selection.length === 0) return;
    const clips = this.state.clips.filter(
      (c) => !this.state.selection.includes(c.id),
    );
    this.commit({ ...this.state, clips, selection: [] });
  };

  /* ---------- Transform / properties ---------- */

  patchClip = (id: string, patch: Partial<EditorClip>): void => {
    const clips = this.state.clips.map((c) =>
      c.id === id ? ({ ...c, ...patch } as EditorClip) : c,
    );
    this.commit({ ...this.state, clips });
  };

  /* ---------- Markers and overlays ---------- */

  addMarker = (kind: MarkerKind, time: number, label: string): Marker => {
    const marker: Marker = {
      id: generateId("mark"),
      kind,
      time: Math.max(0, time),
      label,
    };
    this.commit({ ...this.state, markers: [...this.state.markers, marker] });
    return marker;
  };

  removeMarker = (id: string): void => {
    this.commit({
      ...this.state,
      markers: this.state.markers.filter((m) => m.id !== id),
    });
  };

  addOverlay = (
    overlayKind: OverlayKind,
    text: string,
    subtext?: string,
  ): OverlayClip | null => {
    const track = this.state.tracks.find((t) => t.kind === "overlay");
    if (!track) return null;
    let markerId: string | null = null;
    if (overlayKind === "sponsor_card") {
      const m = this.addMarker(
        "sponsor",
        this.state.playhead,
        text || "Sponsor read",
      );
      markerId = m.id;
    } else if (overlayKind === "subscribe_cta") {
      const m = this.addMarker(
        "subscribe_cta",
        this.state.playhead,
        text || "Subscribe CTA",
      );
      markerId = m.id;
    }
    const clip = makeOverlayClip({
      trackId: track.id,
      overlayKind,
      start: this.state.playhead,
      text,
      subtext,
      markerId,
    });
    let start = clip.start;
    while (
      hasOverlap(this.state.clips, track.id, start, start + clip.duration, null)
    ) {
      start += 0.25;
    }
    const placed = { ...clip, start };
    this.commit({
      ...this.state,
      clips: [...this.state.clips, placed],
      selection: [placed.id],
      duration: Math.max(this.state.duration, start + placed.duration + 1),
    });
    return placed;
  };

  /* ---------- Mark in / out + viral clip extraction ---------- */

  setMarkIn = (time: number | null): void => {
    this.commit({ ...this.state, inPoint: time === null ? null : Math.max(0, time) });
  };

  setMarkOut = (time: number | null): void => {
    this.commit({ ...this.state, outPoint: time === null ? null : Math.max(0, time) });
  };

  markInAtPlayhead = (): void => this.setMarkIn(this.state.playhead);
  markOutAtPlayhead = (): void => this.setMarkOut(this.state.playhead);
  clearMarks = (): void => {
    this.commit({ ...this.state, inPoint: null, outPoint: null });
  };

  /**
   * Create a viral clip region from the current mark-in/out range.
   * The region records the source range and a target preset; the actual
   * 9:16 reframe and export job is produced downstream.
   */
  createViralClip = (
    label: string,
    preset: ExportPresetId,
  ): ViralClipRegion | null => {
    if (this.state.inPoint === null || this.state.outPoint === null)
      return null;
    const start = Math.min(this.state.inPoint, this.state.outPoint);
    const end = Math.max(this.state.inPoint, this.state.outPoint);
    if (end - start < 0.5) return null;
    const region: ViralClipRegion = {
      id: generateId("viral"),
      label: label.trim() || `Clip · ${formatStartLabel(start)}`,
      start,
      end,
      aspect: "9:16",
      preset,
      createdAt: new Date().toISOString(),
    };
    this.commit({
      ...this.state,
      viralClips: [...this.state.viralClips, region],
    });
    return region;
  };

  removeViralClip = (id: string): void => {
    this.commit({
      ...this.state,
      viralClips: this.state.viralClips.filter((v) => v.id !== id),
    });
  };

  /** Replace the entire doc — used when the editor mounts with stored state. */
  replaceDoc = (next: EditorDoc): void => {
    this.commit(next);
  };
}

function formatStartLabel(t: number): string {
  const total = Math.floor(t);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Build a fresh store seeded from an existing or default doc. */
export function createEditorStore(initial: EditorDoc | null): EditorStore {
  return new EditorStore(initial ?? buildDefaultEditorDoc());
}
