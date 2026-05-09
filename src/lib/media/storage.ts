import "server-only";

import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Disk storage layout
 * ===================
 *
 *   <MEDIA_ROOT>/
 *     <projectId>/
 *       <itemId>/
 *         source.<ext>     -- the imported source file (verbatim bytes)
 *         thumb.jpg        -- 1280-wide preview frame (videos only)
 *         probe.json       -- raw ffprobe output for this source
 *         meta.json        -- normalised metadata snapshot
 *
 * Stable references = `<projectId>/<itemId>`. Listing files inside the
 * item directory determines the source extension at read-time so we
 * don't leak that detail into URLs or storage keys.
 */

export const MEDIA_ROOT = path.resolve(
  process.env.VCOS_MEDIA_ROOT ?? path.join(process.cwd(), "data", "media"),
);

const SAFE_ID = /^[A-Za-z0-9._-]+$/;

function assertSafeId(id: string, kind: "project" | "item"): void {
  if (!id || !SAFE_ID.test(id)) {
    throw new Error(`Unsafe ${kind} id: ${id}`);
  }
}

export function projectDir(projectId: string): string {
  assertSafeId(projectId, "project");
  return path.join(MEDIA_ROOT, projectId);
}

export function itemDir(projectId: string, itemId: string): string {
  assertSafeId(itemId, "item");
  return path.join(projectDir(projectId), itemId);
}

export async function ensureItemDir(
  projectId: string,
  itemId: string,
): Promise<string> {
  const dir = itemDir(projectId, itemId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Persist a Web stream to `<itemDir>/source.<ext>`. Writes to a
 * `.partial` file first, then renames atomically. Returns the absolute
 * path and the resolved file size.
 */
export async function saveSourceStream(opts: {
  projectId: string;
  itemId: string;
  fileName: string;
  stream: ReadableStream<Uint8Array>;
}): Promise<{ path: string; size: number }> {
  const dir = await ensureItemDir(opts.projectId, opts.itemId);
  const ext = sanitiseExt(path.extname(opts.fileName));
  const finalPath = path.join(dir, `source${ext}`);
  const partialPath = `${finalPath}.partial`;

  const out = createWriteStream(partialPath);
  // ReadableStream<Uint8Array> -> Node Readable
  const node = Readable.fromWeb(
    opts.stream as unknown as import("node:stream/web").ReadableStream<Uint8Array>,
  );
  await pipeline(node, out);
  await fs.rename(partialPath, finalPath);
  const stat = await fs.stat(finalPath);
  return { path: finalPath, size: stat.size };
}

/** Locate the source file for an item by scanning the item dir. */
export async function findSourceFile(
  projectId: string,
  itemId: string,
): Promise<{ path: string; size: number; mtime: Date } | null> {
  let entries: string[];
  try {
    entries = await fs.readdir(itemDir(projectId, itemId));
  } catch {
    return null;
  }
  const source = entries.find((e) => e.startsWith("source."));
  if (!source) return null;
  const full = path.join(itemDir(projectId, itemId), source);
  const stat = await fs.stat(full);
  if (!stat.isFile()) return null;
  return { path: full, size: stat.size, mtime: stat.mtime };
}

export async function findThumbnail(
  projectId: string,
  itemId: string,
): Promise<{ path: string; size: number } | null> {
  const full = path.join(itemDir(projectId, itemId), "thumb.jpg");
  try {
    const stat = await fs.stat(full);
    if (!stat.isFile()) return null;
    return { path: full, size: stat.size };
  } catch {
    return null;
  }
}

export async function writeProbeFile(
  projectId: string,
  itemId: string,
  payload: unknown,
): Promise<void> {
  const dir = await ensureItemDir(projectId, itemId);
  await fs.writeFile(path.join(dir, "probe.json"), JSON.stringify(payload, null, 2), "utf8");
}

export async function writeMetaFile(
  projectId: string,
  itemId: string,
  payload: unknown,
): Promise<void> {
  const dir = await ensureItemDir(projectId, itemId);
  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(payload, null, 2), "utf8");
}

export async function deleteItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  const dir = itemDir(projectId, itemId);
  await fs.rm(dir, { recursive: true, force: true });
}

/** Public preview URL — Range-aware streamer route. */
export function previewUrl(projectId: string, itemId: string): string {
  return `/api/media/preview/${encodeURIComponent(projectId)}/${encodeURIComponent(itemId)}`;
}

/** Public thumbnail URL. */
export function thumbnailUrl(projectId: string, itemId: string): string {
  return `/api/media/thumbnail/${encodeURIComponent(projectId)}/${encodeURIComponent(itemId)}`;
}

/** Stable storage key persisted in project state. */
export function storageKey(projectId: string, itemId: string): string {
  return `${projectId}/${itemId}`;
}

/**
 * Drop unsafe characters from an extension. Keeps `.mp4`, `.mov`, etc.
 * Falls back to `.bin` if nothing usable remains.
 */
function sanitiseExt(ext: string): string {
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  if (!cleaned || cleaned === ".") return ".bin";
  return cleaned;
}
