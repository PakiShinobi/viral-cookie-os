import { type ReactNode } from "react";

/*
 * PageHeader — page title + optional description + optional action.
 *
 * Spacing above/below is owned by PageShell (space-y-8).
 * No manual mb-8 on pages. No wrapper div on callers.
 *
 * With action:    flex items-start justify-between
 * Without action: stacked title + description
 */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const heading = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-sm text-muted">{description}</p>
      )}
    </div>
  );

  if (action) {
    return (
      <div className="flex items-start justify-between">
        {heading}
        {action}
      </div>
    );
  }

  return heading;
}
