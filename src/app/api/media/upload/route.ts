import { NextResponse } from "next/server";

import { importMediaFile } from "@/lib/media/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SAFE_ID = /^[A-Za-z0-9._-]+$/;

/**
 * POST /api/media/upload
 *
 *   FormData:
 *     - projectId: string  (required, must be a safe id)
 *     - file: File         (required, video/* or audio/*)
 *     - kind: "video" | "audio"  (optional override)
 *
 * Returns the resolved `MediaImportResult` so the client can persist a
 * stable reference (storageKey, previewUrl, thumbnailUrl, probe) into
 * the project bin.
 *
 * Local-first: bytes land under the configured media root. No cloud
 * storage. No DB writes (project state is still localStorage-driven
 * for now; the file path is just a stable handle).
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid multipart payload: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  const projectId = form.get("projectId");
  if (typeof projectId !== "string" || !SAFE_ID.test(projectId)) {
    return NextResponse.json(
      { error: "Missing or invalid projectId" },
      { status: 400 },
    );
  }

  const fileEntry = form.get("file");
  if (!fileEntry || typeof fileEntry === "string") {
    return NextResponse.json(
      { error: "Missing file in multipart payload" },
      { status: 400 },
    );
  }
  const file = fileEntry as File;

  const kindHint = form.get("kind");
  const kind =
    typeof kindHint === "string" && (kindHint === "video" || kindHint === "audio")
      ? kindHint
      : undefined;

  try {
    const result = await importMediaFile({
      projectId,
      fileName: file.name || "source.bin",
      mimeType: file.type || "application/octet-stream",
      stream: file.stream(),
      kind,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: `Import failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
