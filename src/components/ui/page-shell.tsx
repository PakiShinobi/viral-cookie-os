import { type ReactNode } from "react";

/*
 * PageShell — page-level max-width container.
 *
 * Controls all vertical rhythm via space-y.
 * No manual mb-* or space-y-* on pages.
 *
 * default  → max-w-5xl space-y-8  (data pages: dashboard, content list, calendar, automation)
 * detail   → max-w-3xl space-y-6  (detail pages: content item, wizard)
 * narrow   → max-w-2xl space-y-8  (form pages: new content, titles, profile)
 */

const widthMap = {
  default: "mx-auto max-w-5xl space-y-8",
  detail: "mx-auto max-w-3xl space-y-6",
  narrow: "mx-auto max-w-2xl space-y-8",
} as const;

type Width = keyof typeof widthMap;

export function PageShell({
  children,
  width = "default",
}: {
  children: ReactNode;
  width?: Width;
}) {
  return <div className={widthMap[width]}>{children}</div>;
}
