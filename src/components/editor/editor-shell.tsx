"use client";

import { EditorProvider } from "@/lib/editor/use-editor";
import type { PodcastProject } from "@/lib/podcast/types";
import { PreviewCanvas } from "./canvas";
import { Inspector } from "./inspector";
import { LeftRail } from "./left-rail";
import { Timeline } from "./timeline/timeline";
import { TopBar } from "./top-bar";
import { TransportEngine } from "./transport-engine";
import { TransportShortcuts } from "./transport-shortcuts";

/**
 * EditorShell — the editor workspace.
 *
 * Layout (full viewport, no app sidebar):
 *
 *   ┌─ TopBar ─────────────────────────────────────────────┐
 *   │ LeftRail │ PreviewCanvas (centered)     │ Inspector  │
 *   │          │                              │            │
 *   ├──────────┴──────────────────────────────┴────────────┤
 *   │ Timeline (full width)                                │
 *   └──────────────────────────────────────────────────────┘
 *
 * EditorProvider seeds the store from project.editor (or a default doc)
 * and autosaves changes back to the project.
 */

export function EditorShell({ project }: { project: PodcastProject }) {
  return (
    <EditorProvider project={project}>
      <TopBar project={project} />
      <div className="flex min-h-0 flex-1">
        <LeftRail project={project} />
        <PreviewCanvas project={project} />
        <Inspector project={project} />
      </div>
      <Timeline project={project} />
      <TransportEngine project={project} />
      <TransportShortcuts />
    </EditorProvider>
  );
}
