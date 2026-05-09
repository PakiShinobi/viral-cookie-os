import { NextResponse } from "next/server";

import { runSyncAnalysis } from "@/lib/media/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SAFE_ID = /^[A-Za-z0-9._-]+$/;

/**
 * POST /api/media/sync
 *
 *   { projectId, referenceItemId, candidateItemId, searchWindowSec? }
 *
 * Run peak-domain cross-correlation between two waveforms and return
 * a `SyncRecord`. Both items must already have a `peaks.json` on disk
 * (i.e. their import-time processing job succeeded).
 *
 * Synchronous: typical podcast-length analysis finishes in well under
 * a second on the static peaks data.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const projectId = (body as { projectId?: unknown }).projectId;
  const referenceItemId = (body as { referenceItemId?: unknown }).referenceItemId;
  const candidateItemId = (body as { candidateItemId?: unknown }).candidateItemId;
  const searchWindowSec = (body as { searchWindowSec?: unknown })
    .searchWindowSec;

  if (
    typeof projectId !== "string" ||
    !SAFE_ID.test(projectId) ||
    typeof referenceItemId !== "string" ||
    !SAFE_ID.test(referenceItemId) ||
    typeof candidateItemId !== "string" ||
    !SAFE_ID.test(candidateItemId)
  ) {
    return NextResponse.json(
      {
        error:
          "projectId, referenceItemId and candidateItemId are required and must be safe ids",
      },
      { status: 400 },
    );
  }
  if (referenceItemId === candidateItemId) {
    return NextResponse.json(
      { error: "Reference and candidate must differ" },
      { status: 400 },
    );
  }

  try {
    const record = await runSyncAnalysis({
      projectId,
      referenceItemId,
      candidateItemId,
      searchWindowSec:
        typeof searchWindowSec === "number" && searchWindowSec > 0
          ? searchWindowSec
          : undefined,
    });
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json(
      { error: `Sync analysis failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
