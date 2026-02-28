import { type ReactNode } from "react";

/*
 * Card — primary content container.
 *
 * Rules:
 *   - Always rounded-xl border border-border bg-surface.
 *   - No shadows. No gradients.
 *   - overflow prop adds overflow-hidden (required for table wrappers to clip border-radius).
 *   - padding="none"  → no padding (use CardHeader + inner divs with explicit padding)
 *   - padding="md"    → p-5  (data cards, section cards)
 *   - padding="lg"    → p-6  (form containers)
 *
 * CardHeader:
 *   - Always border-b border-border px-4 py-3.
 *   - title: text-[13px] font-semibold text-foreground.
 *   - action: optional ReactNode rendered in the right slot.
 */

const paddingMap = {
  none: "",
  md: "p-5",
  lg: "p-6",
} as const;

type Padding = keyof typeof paddingMap;

export function Card({
  children,
  padding = "none",
  overflow = false,
  className,
}: {
  children: ReactNode;
  padding?: Padding;
  overflow?: boolean;
  className?: string;
}) {
  const parts = [
    "rounded-xl border border-border bg-surface",
    paddingMap[padding],
    overflow ? "overflow-hidden" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={parts}>{children}</div>;
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      {action ? (
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
          {action}
        </div>
      ) : (
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      )}
    </div>
  );
}
