"use client";

import {
  useEditorDoc,
  useEditorPlayback,
  useEditorStore,
} from "@/lib/editor/use-editor";
import type { AudioClip, EditorDoc } from "@/lib/editor/types";
import type { PodcastProject } from "@/lib/podcast/types";
import { useEffect, useMemo, useRef } from "react";

/**
 * TransportEngine — invisible component that owns playback timing.
 *
 * Responsibilities:
 *   - Drives the playhead forward via requestAnimationFrame while playing.
 *   - Mounts a hidden `<audio>` element for every audio clip currently
 *     under (or overlapping) the playhead window, and keeps each one
 *     seeked to its source-time mapping.
 *   - When playing, resumes all audio elements; pauses them on stop.
 *   - Stops playback automatically at the end of the timeline.
 *
 * Master clock: pure RAF wall-clock. The active video clip in the canvas
 * follows the playhead via its own seek effect. Drift between the RAF
 * clock and the video element is kept small because every frame the
 * video re-syncs to the new playhead. Future: lock the video element as
 * the master clock when present, but RAF is good enough for podcast
 * scrubbing.
 */

export function TransportEngine({ project }: { project: PodcastProject }) {
  const store = useEditorStore();
  const doc = useEditorDoc();
  const isPlaying = useEditorPlayback();

  // RAF master clock.
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);
  const playheadRef = useRef<number>(doc.playhead);
  playheadRef.current = doc.playhead;

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    lastTRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTRef.current) / 1000;
      lastTRef.current = now;
      const next = playheadRef.current + dt;
      const end = effectiveEnd(doc);
      if (end > 0 && next >= end) {
        store.setPlayhead(end);
        store.pause();
        return;
      }
      store.setPlayhead(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // doc.duration / clips are read off the live store inside `tick`, but
    // we want a fresh closure if `doc` identity flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, store]);

  // Audio sources we want playing during the current playback window.
  const activeAudio = useMemo(() => {
    const items: {
      id: string;
      src: string;
      sourceTime: number;
      gain: number;
    }[] = [];
    for (const clip of doc.clips) {
      if (clip.kind !== "audio") continue;
      const audio = clip as AudioClip;
      const playhead = doc.playhead;
      if (playhead < audio.start || playhead >= audio.start + audio.duration) {
        continue;
      }
      const media = project.mediaBin.find((m) => m.id === audio.mediaId);
      if (!media) continue;
      // Prefer the extracted PCM WAV when available; the original audio
      // file is the only viable source otherwise.
      const src = media.audioUrl ?? media.previewUrl;
      if (!src) continue;
      items.push({
        id: clip.id,
        src,
        sourceTime: Math.max(0, audio.inPoint + (playhead - audio.start)),
        gain: audio.gain,
      });
    }
    return items;
    // We deliberately re-derive on any doc/playhead change; the array is
    // small (<= track count) so this is cheap.
  }, [doc, project.mediaBin]);

  return (
    <div aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      {activeAudio.map((entry) => (
        <AudioVoice
          key={entry.id}
          src={entry.src}
          sourceTime={entry.sourceTime}
          gain={entry.gain}
          isPlaying={isPlaying}
        />
      ))}
    </div>
  );
}

function effectiveEnd(doc: EditorDoc): number {
  // Use the latest clip end as the natural stop point, falling back to
  // the document's declared duration. This keeps playback usable on
  // freshly imported projects where `doc.duration` is still 0.
  let end = 0;
  for (const c of doc.clips) {
    end = Math.max(end, c.start + c.duration);
  }
  return Math.max(end, doc.duration);
}

interface AudioVoiceProps {
  src: string;
  sourceTime: number;
  gain: number;
  isPlaying: boolean;
}

function AudioVoice({ src, sourceTime, gain, isPlaying }: AudioVoiceProps) {
  const ref = useRef<HTMLAudioElement>(null);

  // Seek when the source time drifts beyond the tolerance window. We
  // don't want to seek every RAF frame — that audibly clicks.
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    if (Math.abs(a.currentTime - sourceTime) > 0.12) {
      try {
        a.currentTime = sourceTime;
      } catch {
        /* metadata-not-ready can throw; will retry next effect */
      }
    }
  }, [sourceTime]);

  // Apply gain (clamped 0..1 since <audio>.volume can't exceed 1).
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.volume = Math.min(1, Math.max(0, gain));
  }, [gain]);

  // Play / pause according to transport.
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    if (isPlaying) {
      const promise = a.play();
      if (promise && typeof promise.catch === "function") {
        // Safari throws when play() is called too eagerly; ignore — the
        // next user gesture will let it resume.
        promise.catch(() => {});
      }
    } else {
      a.pause();
    }
  }, [isPlaying]);

  // Seek immediately when the underlying source URL changes.
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    try {
      a.currentTime = sourceTime;
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <audio
      ref={ref}
      src={src}
      preload="metadata"
      // Critical: we want the audio playback to be scheduled but not
      // routed through OS notifications.
      controls={false}
    />
  );
}
