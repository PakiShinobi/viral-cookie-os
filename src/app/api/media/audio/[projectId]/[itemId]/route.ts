import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { findExtractedAudio } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media/audio/[projectId]/[itemId]
 *
 * Stream the extracted PCM WAV with HTTP Range support. Used by the
 * editor's per-track `<audio>` elements to play guest mics in sync
 * with the active video. Mirrors the source-preview Range route, but
 * always returns `audio/wav` and only succeeds when extraction has
 * completed.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ projectId: string; itemId: string }> },
) {
  const { projectId, itemId } = await ctx.params;
  const located = await findExtractedAudio(projectId, itemId);
  if (!located) {
    return new Response("Audio not yet extracted", { status: 404 });
  }

  const total = located.size;
  const range = request.headers.get("range");
  const baseHeaders = {
    "Content-Type": "audio/wav",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=60",
  } satisfies Record<string, string>;

  if (!range) {
    return new Response(
      Readable.toWeb(createReadStream(located.path)) as ReadableStream,
      {
        status: 200,
        headers: {
          ...baseHeaders,
          "Content-Length": String(total),
        },
      },
    );
  }

  const parsed = parseRange(range, total);
  if (!parsed) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }
  const { start, end } = parsed;
  const length = end - start + 1;
  return new Response(
    Readable.toWeb(
      createReadStream(located.path, { start, end }),
    ) as ReadableStream,
    {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(length),
        "Content-Range": `bytes ${start}-${end}/${total}`,
      },
    },
  );
}

function parseRange(
  raw: string,
  total: number,
): { start: number; end: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(raw.trim());
  if (!m) return null;
  const startStr = m[1];
  const endStr = m[2];
  let start: number;
  let end: number;
  if (startStr === "" && endStr === "") return null;
  if (startStr === "") {
    const suffix = Number(endStr);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else if (endStr === "") {
    start = Number(startStr);
    end = total - 1;
  } else {
    start = Number(startStr);
    end = Number(endStr);
  }
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end >= total ||
    start > end
  ) {
    return null;
  }
  return { start, end };
}
