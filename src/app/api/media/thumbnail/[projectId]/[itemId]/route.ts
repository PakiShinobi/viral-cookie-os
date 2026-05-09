import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { findThumbnail } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media/thumbnail/[projectId]/[itemId]
 *
 * Serves the JPEG thumbnail generated during import. 404 if the item
 * has no thumbnail (audio-only, or generation failed).
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ projectId: string; itemId: string }> },
) {
  const { projectId, itemId } = await ctx.params;
  const located = await findThumbnail(projectId, itemId);
  if (!located) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(
    Readable.toWeb(createReadStream(located.path)) as ReadableStream,
    {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(located.size),
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
