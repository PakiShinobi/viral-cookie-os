import { type ButtonHTMLAttributes, type ReactNode } from "react";

/*
 * Button — primary and ghost variants only.
 *
 * buttonClass() → use on <Link> elements that need button styling.
 * <Button>      → use for <button> elements.
 *
 * Variants:
 *   primary  → rose fill, white text
 *   ghost    → bordered, muted text, border-strong hover
 *
 * Sizes:
 *   default  → inline (px-4 py-2)
 *   wide     → full-width (w-full py-2.5)
 *
 * Rules:
 *   - text-[13px] font-medium always (never text-sm, never font-bold).
 *   - rounded-lg always.
 *   - disabled:opacity-50 always on primary and ghost.
 *   - transition-colors always.
 *   - No new variants without updating design-system.md.
 */

const classes = {
  primary: {
    default:
      "rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50",
    wide: "w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50",
  },
  ghost: {
    default:
      "rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50",
    wide: "w-full rounded-lg border border-border py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50",
  },
} as const;

type Variant = keyof typeof classes;
type Size = keyof (typeof classes)[Variant];

export function buttonClass(options?: {
  variant?: Variant;
  size?: Size;
}): string {
  return classes[options?.variant ?? "primary"][options?.size ?? "default"];
}

export function Button({
  variant = "primary",
  size = "default",
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  const base = buttonClass({ variant, size });
  return (
    <button
      className={className ? `${base} ${className}` : base}
      {...props}
    >
      {children}
    </button>
  );
}
