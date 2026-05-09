import Link from "next/link";

/**
 * EmptyProjects — calm zero-state for the podcast list and dashboard strip.
 *
 * Communicates the three outputs of the pipeline so the user understands
 * what they're about to set up.
 */

export function EmptyProjects({
  variant = "page",
}: {
  variant?: "page" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-surface/40 px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          No active projects
        </span>
        <span className="hidden text-[12px] text-muted sm:inline">
          Spin up a podcast project to start the pipeline.
        </span>
        <Link
          href="/podcast/new"
          className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          New project
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-grain relative overflow-hidden rounded-3xl border border-border bg-surface/70">
      <div className="relative z-10 flex flex-col items-start gap-8 p-8 sm:p-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Studio · Empty bay
          </p>
          <h2 className="font-mono text-[28px] font-medium leading-[1.1] tracking-tight text-foreground sm:text-[34px]">
            Open the editor.
            <br />
            <span className="text-accent">Cut your first episode.</span>
          </h2>
          <p className="max-w-md text-[14px] leading-relaxed text-muted">
            CapCut for podcasts and viral clips. Drop a video, hit the
            timeline, and ship a long-form, an audio cut, and a stack of
            9:16 reels — all from one project.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Link
              href="/podcast/new"
              className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Start editing
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Drops you into the editor in seconds
            </span>
          </div>
        </div>

        <div className="grid w-full max-w-sm grid-cols-1 gap-2 lg:w-[340px]">
          <OutputBlock
            number="01"
            title="Full episode"
            sub="YouTube long-form"
          />
          <OutputBlock
            number="02"
            title="Audio episode"
            sub="Spotify · Apple · RSS"
          />
          <OutputBlock
            number="03"
            title="Viral reels"
            sub="TikTok · Reels · Shorts"
          />
        </div>
      </div>
    </div>
  );
}

function OutputBlock({
  number,
  title,
  sub,
}: {
  number: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3">
      <span className="font-mono text-[11px] tabular-nums tracking-[0.14em] text-muted">
        {number}
      </span>
      <div className="flex-1">
        <p className="text-[13px] font-medium text-foreground">{title}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {sub}
        </p>
      </div>
      <span className="text-muted/60">
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
          <path
            d="M2 5.5H9M9 5.5L5.5 2M9 5.5L5.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
