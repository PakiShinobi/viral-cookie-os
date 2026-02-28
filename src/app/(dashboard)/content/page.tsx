import { createServerClient } from "@/lib/supabase/server";
import type { Content } from "@/lib/types";
import Link from "next/link";

const stageBadgeColor: Record<string, string> = {
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

export default async function ContentListPage() {
  const supabase = await createServerClient();

  const { data: items } = await supabase
    .from("content")
    .select("*")
    .order("updated_at", { ascending: false })
    .returns<Content[]>();

  const content = items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Content
        </h1>
        <Link
          href="/content/new"
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          New Content
        </Link>
      </div>

      {content.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-sm text-muted">No content yet</p>
          <Link
            href="/content/new"
            className="mt-3 inline-block text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            Create your first piece of content
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {content.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/${item.id}`}
                      className="text-[13px] font-medium text-foreground hover:text-accent transition-colors"
                    >
                      {item.title}
                    </Link>
                    {item.tags.length > 0 && (
                      <span className="ml-2 text-[11px] text-muted">
                        {item.tags[0]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted capitalize">
                    {item.content_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        stageBadgeColor[item.stage] ??
                        "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {item.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
