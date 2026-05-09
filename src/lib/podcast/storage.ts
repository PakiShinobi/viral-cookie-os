"use client";

import type { PodcastProject } from "./types";

/**
 * Browser-local persistence for podcast projects.
 *
 * Why localStorage and not Supabase:
 *   The MVP is about the workflow shape, not the persistence backend.
 *   Auth is currently bypassed and writes are blocked. Keeping state on the
 *   client lets the user start a real project today, while leaving a clean
 *   read/write API that can be swapped for Supabase tables later.
 *
 * The storage layer is intentionally narrow:
 *   list / get / save / remove / subscribe.
 *
 * Higher-level mutations (create, update media, advance stage) live in the
 * services module, which composes these primitives.
 */

const STORAGE_KEY = "vcos.podcast.projects.v1";
const EVENT_NAME = "vcos.podcast.projects.changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAll(): PodcastProject[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PodcastProject[];
  } catch {
    return [];
  }
}

function writeAll(projects: PodcastProject[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function listProjects(): PodcastProject[] {
  return readAll().sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getProject(id: string): PodcastProject | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export function saveProject(project: PodcastProject): PodcastProject {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === project.id);
  const next: PodcastProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  if (idx === -1) all.push(next);
  else all[idx] = next;
  writeAll(all);
  return next;
}

export function removeProject(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

/**
 * Subscribe to any change to the project store. Fires after local writes
 * and on cross-tab `storage` events.
 *
 * Returns an unsubscribe function.
 */
export function subscribe(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handleCustom = () => listener();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener(EVENT_NAME, handleCustom);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

export const PODCAST_STORAGE_EVENT = EVENT_NAME;
