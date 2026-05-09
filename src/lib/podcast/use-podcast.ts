"use client";

import { useSyncExternalStore } from "react";
import { getProject, listProjects, subscribe } from "./storage";
import type { PodcastProject } from "./types";

/**
 * Reactive views over the podcast project store.
 *
 * Backed by `useSyncExternalStore` so React stays in sync with localStorage
 * mutations (including cross-tab `storage` events) without tripping the
 * `react-hooks/set-state-in-effect` lint rule.
 *
 * Snapshot stability rules — re-reading these is cheap, but React requires:
 *   1. The same reference when the underlying store hasn't changed.
 *   2. The SAME reference for the server snapshot across renders, otherwise
 *      "The result of getServerSnapshot should be cached to avoid an
 *      infinite loop" fires.
 *
 * We therefore:
 *   - Compare a JSON key after each read to short-circuit identical results.
 *   - Hand out frozen, module-level constants for server snapshots.
 */

/* ===============================
   Server (SSR) snapshots — frozen, shared, never re-allocated.
================================ */

const EMPTY_PROJECTS: readonly PodcastProject[] = Object.freeze([]);

function getServerProjectsSnapshot(): PodcastProject[] {
  return EMPTY_PROJECTS as PodcastProject[];
}

function getServerProjectSnapshot(): PodcastProject | null {
  return null;
}

/* ===============================
   Client snapshots — cached by structural key.
================================ */

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
  projectSnapshotCache.set(id, { key, value: fresh });
  return fresh;
}

/* ===============================
   useMounted — client-side hydration flag.
================================ */

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

/* ===============================
   Hooks.
================================ */

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

// Per-id snapshot getters need to be stable across renders so React doesn't
// see them as a "new store". We memoise them by id.
const projectSnapshotGetters = new Map<string, () => PodcastProject | null>();

function getProjectSnapshotGetter(id: string): () => PodcastProject | null {
  let fn = projectSnapshotGetters.get(id);
  if (!fn) {
    fn = () => getProjectSnapshotFor(id);
    projectSnapshotGetters.set(id, fn);
  }
  return fn;
}

const NULL_GETTER: () => PodcastProject | null = () => null;

export function useProject(id: string | null | undefined): {
  project: PodcastProject | null;
  ready: boolean;
} {
  const getSnapshot = id ? getProjectSnapshotGetter(id) : NULL_GETTER;
  const project = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerProjectSnapshot,
  );
  const ready = useMounted();
  return { project, ready };
}
