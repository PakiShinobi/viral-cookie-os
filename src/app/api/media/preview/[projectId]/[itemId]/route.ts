import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { findSourceFile } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media/preview/[projectId]/[itemId]
 *
 * Stream the source file with HTTP Range support. Required for the
 * `<video>` element to seek without buffering the entire file.
 *
 * - 200 with full-content Content-Length when no Range header.
 * - 206 with Content-Range when a Range header is present.
 * - 416 when Range is invalid for the file size.
 * - 404 when the item does not exist.
 *
 * Caching: `private, max-age=60` — short window so re-imports take
 * effect quickly, long enough to feel snappy when scrubbing.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ projectId: string; itemId: string }> },
) {
  const { projectId, itemId } = await ctx.params;
  const located = await findSourceFile(projectId, itemId);
  if (!located) {
    return new Response("Not found", { status: 404 });
  }

  const total = located.size;
  const ext = path.extname(located.path).toLowerCase();
  const contentType = mimeFor(ext);
  const range = request.headers.get("range");

  if (!range) {
    return new Response(
      Readable.toWeb(createReadStream(located.path)) as ReadableStream,
      {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(total),
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  }

  const parsed = parseRange(range, total);
  if (!parsed) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: {
        "Content-Range": `bytes */${total}`,
      },
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
        "Content-Type": contentType,
        "Content-Length": String(length),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=60",
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
    // Suffix range: bytes=-N (last N bytes)
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

function mimeFor(ext: string): string {
  switch (ext) {
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    case ".mkv":
      return "video/x-matroska";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".m4a":
      return "audio/mp4";
    case ".ogg":
      return "audio/ogg";
    case ".flac":
      return "audio/flac";
    default:
      return "application/octet-stream";
  }
}
