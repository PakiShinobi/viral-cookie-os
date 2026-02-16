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
    <div className="rounded-lg border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-2">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-slate-500">
            {emptyText}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/content/${item.id}`}
                  className="block truncate rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
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
