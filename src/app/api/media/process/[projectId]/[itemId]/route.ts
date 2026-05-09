import { NextResponse } from "next/server";

import { enqueueJob } from "@/lib/media/queue";
import { processMediaItem } from "@/lib/media/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/media/process/[projectId]/[itemId]
 *
 * Idempotently kick off audio extraction + waveform generation for an
 * already-imported source. Useful when:
 *   - A previous job failed and the user retries.
 *   - A legacy bin item pre-dates the audio pipeline.
 *
 * Returns the queued job descriptor immediately; the client polls
 * `/api/media/jobs/[id]` for completion.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ projectId: string; itemId: string }> },
) {
  const { projectId, itemId } = await ctx.params;
  let kind: "video" | "audio" = "video";
  try {
    const body = await request.json().catch(() => null);
    if (body && (body.kind === "video" || body.kind === "audio")) {
      kind = body.kind;
    }
  } catch {
    /* body is optional */
  }

  const job = enqueueJob({
    projectId,
    itemId,
    kind: "process_media",
    message: "Queued for audio processing",
    work: async (j) =>
      processMediaItem({
        projectId,
        itemId,
        kind,
        jobId: j.id,
      }),
  });

  return NextResponse.json({
    jobId: job.id,
    projectId,
    itemId,
    status: job.status,
  });
}
