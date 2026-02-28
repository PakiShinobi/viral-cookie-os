"use client";

import { forwardRef, type ComponentProps } from "react";

/*
 * input.tsx — canonical form control components.
 *
 * inputClass is the single source of truth for all form control styling.
 * It is exported so it can be applied manually in edge cases (e.g. a
 * controlled input that must remain in a client component without this import).
 *
 * Rules:
 *   - No mt-* or mb-* inside inputClass. Field handles label-to-input spacing.
 *   - py-2 standard. Override with className only for intentional exceptions.
 *   - bg-surface-2 always. Never bg-white or bg-background.
 *   - focus ring: focus:border-accent focus:ring-1 focus:ring-accent
 *   - outline-none always (ring replaces browser outline).
 *
 * All three components (Input, Select, Textarea) share the same base class.
 * Pass className to override individual properties where needed.
 */

export const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={className ? `${inputClass} ${className}` : inputClass}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={className ? `${inputClass} ${className}` : inputClass}
      {...props}
    />
  ),
);
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={className ? `${inputClass} ${className}` : inputClass}
    {...props}
  />
));
Textarea.displayName = "Textarea";
