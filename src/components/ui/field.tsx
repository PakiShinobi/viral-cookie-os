import { type ReactNode } from "react";

/*
 * Field — label wrapper for any form control.
 *
 * Owns the label class and label-to-input gap (mb-1 on label).
 * The input itself carries no mt-* — Field handles all spacing.
 *
 * Label always: text-[13px] font-medium text-foreground
 * Hint (optional text): text-[11px] font-normal text-muted, inline after label
 * Required marker: text-error * (never text-red-500)
 *
 * Usage:
 *   <Field label="Title" htmlFor="title">
 *     <Input id="title" name="title" />
 *   </Field>
 *
 *   <Field label="Niche" htmlFor="niche" required hint="(pick one)">
 *     <Select id="niche" name="niche">…</Select>
 *   </Field>
 */

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[13px] font-medium text-foreground"
      >
        {label}
        {hint && (
          <span className="ml-1 text-[11px] font-normal text-muted">{hint}</span>
        )}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
    </div>
  );
}
