import { type ReactNode } from "react";

/*
 * badge.tsx — status badge shape + canonical colour maps.
 *
 * Badge: shape-only component. Caller provides the colour class from a map.
 *   Shape always: inline-block rounded px-1.5 py-0.5 text-[11px] font-medium
 *
 * Colour maps:
 *   stageBadgeClass      — content pipeline stages (idea → archived)
 *   cronStatusClass      — automation run status (success / failed / running)
 *   publishStatusClass   — publishing record status (published / pending / failed)
 *
 * Rules:
 *   - rounded, not rounded-full. Status = rectangle, not pill.
 *   - All backgrounds use /10 opacity modifier. Never solid colour fills.
 *   - No inline red-500, green-500, etc. Use the maps.
 *   - stageBadgeClass is the single source of truth — import, don't redefine.
 */

const badgeBase =
  "inline-block rounded px-1.5 py-0.5 text-[11px] font-medium";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return <span className={`${badgeBase} ${className}`}>{children}</span>;
}

export const stageBadgeClass: Record<string, string> = {
  idea: "bg-zinc-500/10 text-zinc-400",
  brief: "bg-blue-500/10 text-blue-400",
  script: "bg-purple-500/10 text-purple-400",
  record: "bg-orange-500/10 text-orange-400",
  edit: "bg-yellow-500/10 text-yellow-400",
  review: "bg-cyan-500/10 text-cyan-400",
  publish: "bg-green-500/10 text-green-400",
  distribute: "bg-emerald-500/10 text-emerald-400",
  archived: "bg-zinc-500/5 text-zinc-600",
};

export const cronStatusClass: Record<string, string> = {
  success: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
  running: "bg-warning/10 text-warning",
};

export const publishStatusClass: Record<string, string> = {
  published: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-error/10 text-error",
};
