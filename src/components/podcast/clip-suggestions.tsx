import { formatTimecode } from "@/lib/podcast/format";
import type { ViralClipSuggestion } from "@/lib/podcast/types";

/**
 * ClipSuggestions — placeholder list of viral clip candidates surfaced
 * by the Find Viral Clips action. The score and timecodes are mocked
 * locally; a real clipper plugs into the same shape.
 */

export function ClipSuggestions({
  suggestions,
}: {
  suggestions: ViralClipSuggestion[];
}) {
  if (suggestions.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
          Clip Candidates
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {suggestions.length} found · 9:16
        </span>
      </header>
      <ol className="overflow-hidden rounded-xl border border-border bg-surface">
        {suggestions.map((c, i) => (
          <li
            key={c.id}
            className={`flex items-center gap-4 px-4 py-3 ${
              i === suggestions.length - 1 ? "" : "border-b border-border"
            }`}
          >
            <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>

            <ClipScore score={c.score} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">
                {c.hook}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {formatTimecode(c.startSec)} → {formatTimecode(c.endSec)}
                <span className="px-1.5 text-border-strong">·</span>
                {Math.round(c.endSec - c.startSec)}s
              </p>
            </div>

            <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Preview
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ClipScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-2">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="font-mono text-[10px] tabular-nums text-muted">
        {pct}
      </span>
    </div>
  );
}
