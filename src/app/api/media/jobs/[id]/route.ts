import { NextResponse } from "next/server";

import { getJob } from "@/lib/media/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media/jobs/[id]
 *
 * Poll-shaped job inspector. Used by future async pipelines (sync,
 * full-episode render, MP3 export, viral clip generation). The
 * synchronous import flow returns its result directly, but exposing
 * this endpoint now means later stages plug in without route churn.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}
