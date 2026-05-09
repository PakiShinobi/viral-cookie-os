"use client";

import { EditorShell } from "@/components/editor/editor-shell";
import {
  getProjectClips,
  getProjectMediaBin,
} from "@/lib/podcast/migrate";
import { useProject } from "@/lib/podcast/use-podcast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Boots the editor for a project.
 *
 * Routing rule: if the project has zero imported sources we redirect to
 * the import studio. The editor is meaningless without media; this keeps
 * users from landing in an empty workspace by accident.
 */

export function EditorPageClient({ projectId }: { projectId: string }) {
  const { project, ready } = useProject(projectId);
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!project) return;
    if (
      getProjectMediaBin(project).length === 0 &&
      getProjectClips(project).length === 0
    ) {
      router.replace(`/podcast/${projectId}/import`);
    }
  }, [ready, project, projectId, router]);

  if (!ready) {
    return <EditorBootSkeleton />;
  }

  if (!project) {
    return <EditorMissing />;
  }

  return <EditorShell project={project} />;
}

function EditorBootSkeleton() {
  return (
    <div className="mx-auto flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Booting editor
      </p>
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full w-1/2 animate-scan rounded-full bg-accent" />
      </span>
    </div>
  );
}

function EditorMissing() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-32 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        Project not found
      </p>
      <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
        This editor session has no project.
      </h1>
      <p className="text-[13px] text-muted">
        It may have been discarded from another tab. Return to the studio
        and start a new project.
      </p>
      <Link
        href="/podcast"
        className="rounded-md border border-border bg-surface-2 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong"
      >
        Back to studio
      </Link>
    </div>
  );
}
