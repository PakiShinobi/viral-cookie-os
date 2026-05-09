import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { findPeaksFile } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media/waveform/[projectId]/[itemId]
 *
 * Serve the peaks JSON for a media item. 404 until the waveform job
 * completes — the client polls the processing job and re-fetches once
 * it sees a ready state.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ projectId: string; itemId: string }> },
) {
  const { projectId, itemId } = await ctx.params;
  const located = await findPeaksFile(projectId, itemId);
  if (!located) return new Response("Waveform not ready", { status: 404 });
  return new Response(
    Readable.toWeb(createReadStream(located.path)) as ReadableStream,
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(located.size),
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
