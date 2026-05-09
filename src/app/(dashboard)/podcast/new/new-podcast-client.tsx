"use client";

import { createProject } from "@/lib/podcast/services";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Auto-create a project on mount and redirect to the import studio.
 *
 * Showing a brief "Spinning up project…" flash communicates that work is
 * happening; the redirect typically lands within ~50ms. If something goes
 * wrong (it shouldn't, since storage is local) we fall back to a manual
 * retry button rather than spinning forever.
 */
export function NewPodcastClient() {
  const router = useRouter();
  const triggered = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    try {
      const project = createProject({});
      router.replace(`/podcast/${project.id}/import`);
    } catch (e) {
      // setError is deferred to a microtask so this isn't a synchronous
      // setState during the effect body — we want the error to surface
      // *after* the failed redirect attempt, never during the same render.
      const message =
        e instanceof Error ? e.message : "Could not create project";
      Promise.resolve().then(() => setError(message));
    }
  }, [router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-32 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
        New project
      </p>
      <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
        Spinning up your studio
      </h1>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
        Routing to import…
      </div>
      {error && (
        <div className="space-y-3">
          <p className="font-mono text-[12px] text-error">{error}</p>
          <button
            type="button"
            onClick={() => {
              triggered.current = false;
              setError(null);
              try {
                const project = createProject({});
                router.replace(`/podcast/${project.id}/import`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
              }
            }}
            className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
