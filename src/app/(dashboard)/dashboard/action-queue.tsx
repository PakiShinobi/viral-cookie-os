import Link from "next/link";

export function ActionQueue({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: { id: string; title: string }[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
          {items.length > 0 && (
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted tabular-nums">
              {items.length}
            </span>
          )}
        </div>
      </div>
      <div className="p-1.5">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">{emptyText}</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/content/${item.id}`}
                  className="block truncate rounded-lg px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
