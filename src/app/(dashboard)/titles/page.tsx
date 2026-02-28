"use client";

import { generateAndPlan } from "@/app/actions/titles";
import { useActionState } from "react";

const VIDEO_STYLES = [
  { value: "how_to", label: "How-To" },
  { value: "documentary", label: "Documentary" },
  { value: "news", label: "News" },
  { value: "opinion", label: "Opinion" },
  { value: "breakdown", label: "Breakdown" },
  { value: "story", label: "Story" },
  { value: "educational", label: "Educational" },
];

const DURATIONS = [5, 7, 10, 15, 20, 25, 30, 45, 60];
const COUNTS = [5, 10, 20];

const inputClass =
  "mt-1 block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent";

const labelClass = "block text-[13px] font-medium text-foreground";

export default function TitlesPage() {
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        const result = await generateAndPlan(formData);
        return result;
      } catch (e) {
        return e instanceof Error ? e.message : "Something went wrong";
      }
    },
    null,
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Generate Titles
        </h1>
        <p className="mt-1 text-sm text-muted">
          Generate AI-powered video titles and schedule them on your content
          calendar.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Generation settings */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted">
            Generation
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="count" className={labelClass}>
                Number of titles
              </label>
              <select
                id="count"
                name="count"
                defaultValue="10"
                className={inputClass}
              >
                {COUNTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="video_style" className={labelClass}>
                Video style
              </label>
              <select
                id="video_style"
                name="video_style"
                defaultValue="how_to"
                className={inputClass}
              >
                {VIDEO_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="target_duration_minutes"
                className={labelClass}
              >
                Target duration (minutes)
              </label>
              <select
                id="target_duration_minutes"
                name="target_duration_minutes"
                defaultValue=""
                className={inputClass}
              >
                <option value="">No preference</option>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="topic_override" className={labelClass}>
                Topic override{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="topic_override"
                name="topic_override"
                type="text"
                placeholder="e.g., meal prep for busy professionals"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Calendar planning */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted">
            Calendar Planning
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="videos_per_week" className={labelClass}>
                Videos per week
              </label>
              <select
                id="videos_per_week"
                name="videos_per_week"
                defaultValue="2"
                className={inputClass}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="plan_months" className={labelClass}>
                Plan duration (months)
              </label>
              <select
                id="plan_months"
                name="plan_months"
                defaultValue="1"
                className={inputClass}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-[13px] text-error">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Generating & scheduling..." : "Generate & Schedule"}
        </button>
      </form>
    </div>
  );
}
