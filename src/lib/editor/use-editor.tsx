"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { saveEditorDoc } from "@/lib/podcast/services";
import type { PodcastProject } from "@/lib/podcast/types";
import { createEditorStore, type EditorStore, type SnapHint } from "./store";
import type { EditorDoc } from "./types";

/**
 * Editor context + hooks.
 *
 * - EditorProvider seeds a store from project.editor (or a fresh doc).
 * - useEditorStore returns the imperative store (mutators).
 * - useEditorState subscribes to the doc; selectors are caller-provided.
 * - useEditorSnap subscribes to the transient snap-hint from drag/trim.
 *
 * Autosave: a debounced effect persists the latest doc back into the
 * project record. Runs in the browser only.
 */

const Ctx = createContext<EditorStore | null>(null);

export function EditorProvider({
  project,
  children,
}: {
  project: PodcastProject;
  children: ReactNode;
}) {
  const store = useMemo(
    () => createEditorStore(project.editor),
    // We intentionally only re-seed when switching projects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.id],
  );

  // Debounced autosave: subscribe to the store, persist latest state on idle.
  const projectIdRef = useRef(project.id);
  projectIdRef.current = project.id;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      saveEditorDoc(projectIdRef.current, store.getState());
    };
    const unsubscribe = store.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 600);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      // Final flush on unmount.
      flush();
    };
  }, [store]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useEditorStore(): EditorStore {
  const store = useContext(Ctx);
  if (!store) {
    throw new Error("useEditorStore must be used inside <EditorProvider>");
  }
  return store;
}

/**
 * Subscribe to the editor doc with a stable selector.
 *
 * Important: selectors that build new arrays/objects on every read will
 * cause re-renders. For derived collections, memoize the selector or use
 * a primitive-returning selector (length, ids joined, etc.) and re-derive
 * inside the component with useMemo.
 */
export function useEditorState<T>(selector: (s: EditorDoc) => T): T {
  const store = useEditorStore();
  const subscribe = useCallback(
    (cb: () => void) => store.subscribe(cb),
    [store],
  );
  const getSnapshot = useCallback(
    () => selector(store.getState()),
    [store, selector],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useEditorDoc(): EditorDoc {
  const store = useEditorStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
}

export function useEditorSnap(): SnapHint | null {
  const store = useEditorStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapHint,
    () => null,
  );
}
