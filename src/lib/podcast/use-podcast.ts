"use client";

import { useSyncExternalStore } from "react";
import { getProject, listProjects, subscribe } from "./storage";
import type { PodcastProject } from "./types";

/**
 * Reactive views over the podcast project store.
 *
 * Backed by useSyncExternalStore so React stays in sync with localStorage
 * mutations (including cross-tab `storage` events) without tripping the
 * react-hooks/set-state-in-effect lint rule.
 *
 * Snapshots are cached and only swap when the underlying JSON changes —
 * useSyncExternalStore requires referentially-stable values when the store
 * hasn't changed, otherwise it re-renders on every read.
 */

let projectsSnapshotKey = "";
let projectsSnapshot: PodcastProject[] = [];

function getProjectsSnapshot(): PodcastProject[] {
  const fresh = listProjects();
  const key = JSON.stringify(fresh);
  if (key !== projectsSnapshotKey) {
    projectsSnapshotKey = key;
    projectsSnapshot = fresh;
  }
  return projectsSnapshot;
}

function getServerProjectsSnapshot(): PodcastProject[] {
  return [];
}

const projectSnapshotCache = new Map<
  string,
  { key: string; value: PodcastProject | null }
>();

function getProjectSnapshotFor(id: string): PodcastProject | null {
  const fresh = getProject(id);
  const key = JSON.stringify(fresh);
  const cached = projectSnapshotCache.get(id);
  if (cached && cached.key === key) {
    return cached.value;
  }
  const next = { key, value: fresh };
  projectSnapshotCache.set(id, next);
  return fresh;
}

function getServerProjectSnapshot(): PodcastProject | null {
  return null;
}

/**
 * Mount-aware boolean. Drives skeleton/loading states without resorting to
 * setState-in-useEffect. The first SSR render returns false; the first
 * client render also returns false (matching SSR for hydration safety),
 * and the next subscription tick flips to true.
 */
let isMounted = false;
const mountListeners = new Set<() => void>();
function subscribeMount(cb: () => void): () => void {
  mountListeners.add(cb);
  if (!isMounted) {
    isMounted = true;
    Promise.resolve().then(() => {
      mountListeners.forEach((l) => l());
    });
  }
  return () => {
    mountListeners.delete(cb);
  };
}
function getMountSnapshot(): boolean {
  return isMounted;
}
function getServerMountSnapshot(): boolean {
  return false;
}

export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeMount,
    getMountSnapshot,
    getServerMountSnapshot,
  );
}

export function useProjects(): {
  projects: PodcastProject[];
  ready: boolean;
} {
  const projects = useSyncExternalStore(
    subscribe,
    getProjectsSnapshot,
    getServerProjectsSnapshot,
  );
  const ready = useMounted();
  return { projects, ready };
}

export function useProject(id: string | null | undefined): {
  project: PodcastProject | null;
  ready: boolean;
} {
  const project = useSyncExternalStore(
    subscribe,
    () => (id ? getProjectSnapshotFor(id) : null),
    getServerProjectSnapshot,
  );
  const ready = useMounted();
  return { project, ready };
}
