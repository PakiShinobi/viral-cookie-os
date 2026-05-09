"use client";

import { fetchWaveform } from "@/lib/media/client";
import type { WaveformData } from "@/lib/media/types";
import type { MediaBinItem } from "@/lib/podcast/types";
import { useEffect, useRef, useState } from "react";

/**
 * Renders the real peaks payload for a media item onto a Canvas.
 *
 * The waveform JSON is fetched once per item and cached in a module-
 * level Map so multiple clips that reference the same source (e.g. a
 * sliced audio track on the timeline) share one network read.
 *
 * Drawing is done on a low-DPR Canvas2D — peaks per render are bounded
 * by `width`, so even a multi-hour podcast paints in <2 ms.
 *
 * Sub-range support: pass `inPoint` + `duration` to draw only a slice
 * of the source. This is what the timeline does for trimmed clips.
 */

const cache = new Map<string, Promise<WaveformData | null>>();

function cachedFetchWaveform(
  projectId: string,
  itemId: string,
): Promise<WaveformData | null> {
  const key = `${projectId}/${itemId}`;
  let entry = cache.get(key);
  if (!entry) {
    entry = fetchWaveform(projectId, itemId).catch(() => null);
    cache.set(key, entry);
  }
  return entry;
}

/** Drop the cache for an item — call after re-processing. */
export function invalidateWaveformCache(
  projectId: string,
  itemId: string,
): void {
  cache.delete(`${projectId}/${itemId}`);
}

export interface WaveformViewProps {
  projectId: string;
  item: MediaBinItem;
  /** Width in CSS px. */
  width: number;
  /** Height in CSS px. */
  height: number;
  /** Slice start within the source (seconds). Default 0. */
  inPoint?: number;
  /** Slice length (seconds). Default = source duration. */
  duration?: number;
  /** Foreground color for the peaks. */
  color?: string;
  /** Background color (under the peaks). */
  background?: string;
  className?: string;
}

export function WaveformView({
  projectId,
  item,
  width,
  height,
  inPoint = 0,
  duration,
  color,
  background,
  className,
}: WaveformViewProps) {
  // `dataByItemKey` ensures stale data from a different item never paints
  // — comparing keys instead of clearing state on every prop flip avoids
  // the setState-in-effect anti-pattern.
  const itemKey = `${projectId}/${item.id}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    data: WaveformData;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = loaded && loaded.key === itemKey ? loaded.data : null;

  useEffect(() => {
    if (!item.waveformReady) return;
    let cancelled = false;
    cachedFetchWaveform(projectId, item.id)
      .then((d) => {
        if (cancelled) return;
        if (!d) setError("waveform missing");
        else setLoaded({ key: itemKey, data: d });
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, item.id, item.waveformReady, itemKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || width <= 0 || height <= 0) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    drawPeaks(ctx, data, {
      width,
      height,
      inPoint,
      duration: duration ?? data.durationSec,
      color: color ?? "rgba(255,255,255,0.85)",
    });
  }, [data, width, height, inPoint, duration, color, background]);

  if (!item.waveformReady) {
    return (
      <div
        className={`flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted/70 ${className ?? ""}`}
        style={{ width, height }}
      >
        {item.processingState === "failed"
          ? "waveform failed"
          : "analyzing…"}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.18em] text-error/80 ${className ?? ""}`}
        style={{ width, height }}
      >
        waveform error
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height, display: "block" }}
      aria-hidden
    />
  );
}

function drawPeaks(
  ctx: CanvasRenderingContext2D,
  data: WaveformData,
  opts: {
    width: number;
    height: number;
    inPoint: number;
    duration: number;
    color: string;
  },
): void {
  const { peaks, peakCount, peaksPerSecond, durationSec } = data;
  if (peakCount === 0) return;
  const startBucket = Math.max(
    0,
    Math.floor(opts.inPoint * peaksPerSecond),
  );
  const endBucket = Math.min(
    peakCount,
    Math.ceil(
      Math.min(durationSec, opts.inPoint + opts.duration) * peaksPerSecond,
    ),
  );
  const bucketCount = Math.max(1, endBucket - startBucket);

  const midY = opts.height / 2;
  ctx.fillStyle = opts.color;
  ctx.beginPath();

  // Two rendering modes:
  //   pxPerBucket >= 1 -> draw one bar per bucket
  //   pxPerBucket  < 1 -> aggregate buckets into pixel columns
  const pxPerBucket = opts.width / bucketCount;

  if (pxPerBucket >= 1) {
    for (let i = 0; i < bucketCount; i++) {
      const idx = startBucket + i;
      const min = peaks[idx * 2] ?? 0;
      const max = peaks[idx * 2 + 1] ?? 0;
      const x = i * pxPerBucket;
      const w = Math.max(1, pxPerBucket - 0.5);
      const top = midY - max * midY;
      const bottom = midY - min * midY;
      ctx.rect(x, top, w, Math.max(1, bottom - top));
    }
  } else {
    const bucketsPerCol = bucketCount / opts.width;
    for (let col = 0; col < opts.width; col++) {
      const a = startBucket + Math.floor(col * bucketsPerCol);
      const b = Math.min(
        endBucket,
        startBucket + Math.floor((col + 1) * bucketsPerCol),
      );
      let minVal = 0;
      let maxVal = 0;
      for (let k = a; k < b; k++) {
        const lo = peaks[k * 2] ?? 0;
        const hi = peaks[k * 2 + 1] ?? 0;
        if (lo < minVal) minVal = lo;
        if (hi > maxVal) maxVal = hi;
      }
      const top = midY - maxVal * midY;
      const bottom = midY - minVal * midY;
      ctx.rect(col, top, 1, Math.max(1, bottom - top));
    }
  }
  ctx.fill();
}
