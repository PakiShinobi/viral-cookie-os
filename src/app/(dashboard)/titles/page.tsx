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

export default function TitlesPage() {
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        const result = await generateAndPlan(formData);
        return result; // null means redirect happened, string means error
      } catch (e) {
        return e instanceof Error ? e.message : "Something went wrong";
      }
    },
    null,
  );

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Generate Title Ideas</h1>
      <p className="mt-1 text-sm text-muted">
        Generate AI-powered video titles and schedule them on your content
        calendar.
      </p>

      <form action={formAction} className="mt-6 space-y-5">
        {/* Title count */}
        <div>
          <label htmlFor="count" className="block text-sm font-medium">
            Number of titles
          </label>
          <select
            id="count"
            name="count"
            defaultValue="10"
            className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Video style */}
        <div>
          <label htmlFor="video_style" className="block text-sm font-medium">
            Video style
          </label>
          <select
            id="video_style"
            name="video_style"
            defaultValue="how_to"
            className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {VIDEO_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target duration */}
        <div>
          <label
            htmlFor="target_duration_minutes"
            className="block text-sm font-medium"
          >
            Target duration (minutes)
          </label>
          <select
            id="target_duration_minutes"
            name="target_duration_minutes"
            defaultValue=""
            className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">No preference</option>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </div>

        {/* Topic override */}
        <div>
          <label
            htmlFor="topic_override"
            className="block text-sm font-medium"
          >
            Topic override{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="topic_override"
            name="topic_override"
            type="text"
            placeholder="e.g., meal prep for busy professionals"
            className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <hr className="border-border" />

        <h2 className="text-sm font-bold">Calendar Planning</h2>

        {/* Videos per week */}
        <div>
          <label
            htmlFor="videos_per_week"
            className="block text-sm font-medium"
          >
            Videos per week
          </label>
          <select
            id="videos_per_week"
            name="videos_per_week"
            defaultValue="2"
            className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Plan months */}
        <div>
          <label htmlFor="plan_months" className="block text-sm font-medium">
            Plan duration (months)
          </label>
          <select
            id="plan_months"
            name="plan_months"
            defaultValue="1"
            className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Generating & scheduling..." : "Generate & Schedule"}
        </button>
      </form>
    </div>
  );
}
