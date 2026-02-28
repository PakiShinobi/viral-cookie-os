import { type ReactNode } from "react";

/*
 * table.tsx — table structure primitives.
 *
 * TableWrapper: overflow-hidden rounded-xl card shell for tables.
 *   The overflow-hidden is required to clip table corner cells to rounded-xl.
 *
 * Th: <th> with canonical header cell class.
 * Td: <td> with canonical body cell class.
 *
 * Class constants for rows and body — applied directly to native elements
 * rather than wrapped in components (no value in wrapping <tr> or <tbody>):
 *   tableHeaderRowClass → apply to <tr> inside <thead>
 *   tableBodyClass      → apply to <tbody>
 *   tableRowClass       → apply to <tr> inside <tbody>
 *
 * Rules:
 *   - divide-y divide-border on <tbody>. Never border-b on individual rows.
 *   - hover:bg-surface-2 on <tr>. Never hover:bg-surface.
 *   - Th text always uppercase tracking-wider text-[11px] font-medium text-muted.
 *   - Td text always text-[13px] text-muted (override className for primary cells).
 *   - No inline thClass/tdClass local constants on pages — import from here.
 */

export function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {children}
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const base =
    "px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted";
  return (
    <th className={className ? `${base} ${className}` : base}>{children}</th>
  );
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const base = "px-4 py-3 text-[13px] text-muted";
  return (
    <td className={className ? `${base} ${className}` : base}>{children}</td>
  );
}

export const tableHeaderRowClass = "border-b border-border";
export const tableBodyClass = "divide-y divide-border";
export const tableRowClass = "transition-colors hover:bg-surface-2";
