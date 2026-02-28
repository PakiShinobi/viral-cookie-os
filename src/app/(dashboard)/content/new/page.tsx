"use client";

import { createContent } from "@/app/actions/content";
import Link from "next/link";
import { useActionState } from "react";

const inputClass =
  "mt-1 block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function NewContentPage() {
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await createContent(formData);
        return null;
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
          New Content
        </h1>
        <p className="mt-1 text-sm text-muted">
          Add a new piece of content to your pipeline.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <form action={formAction} className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-[13px] font-medium text-foreground"
            >
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g., How to Build a SaaS in 30 Days"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="niche"
              className="block text-[13px] font-medium text-foreground"
            >
              Niche
            </label>
            <input
              id="niche"
              name="niche"
              type="text"
              placeholder="e.g., SaaS, Fitness, Personal Finance"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-[13px] font-medium text-foreground"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Key points, target audience, angle..."
              className={inputClass}
            />
          </div>

          {error && <p className="text-[13px] text-error">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {isPending ? "Creating..." : "Create"}
            </button>
            <Link
              href="/content"
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
