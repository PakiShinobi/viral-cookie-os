"use client";

import { useEditorStore } from "@/lib/editor/use-editor";
import { useEffect } from "react";

/**
 * TransportShortcuts — wires the global Space-bar play/pause keybind.
 *
 * Mounted as a sibling of the editor shell. Listens on the document so
 * the toggle works regardless of what's focused, except when the user
 * is typing into a text field (Inspector uses inputs liberally).
 */
export function TransportShortcuts() {
  const store = useEditorStore();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      store.togglePlay();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);
  return null;
}
