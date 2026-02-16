import { createServerClient } from "@/lib/supabase";
import type { Content } from "@/lib/types";
import Link from "next/link";

const stageBadgeColor: Record<string, string> = {
  idea: "bg-slate-100 text-slate-600",
  brief: "bg-blue-100 text-blue-700",
  script: "bg-purple-100 text-purple-700",
  record: "bg-orange-100 text-orange-700",
  edit: "bg-yellow-100 text-yellow-700",
  review: "bg-cyan-100 text-cyan-700",
  publish: "bg-green-100 text-green-700",
  distribute: "bg-emerald-100 text-emerald-700",
  archived: "bg-gray-100 text-gray-500",
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
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Content</h1>
        <Link
          href="/content/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          + New Content
        </Link>
      </div>

      {content.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted">No content yet</p>
          <Link
            href="/content/new"
            className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover"
          >
            Create your first piece of content
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3 font-medium text-muted">Title</th>
                <th className="px-4 py-3 font-medium text-muted">Type</th>
                <th className="px-4 py-3 font-medium text-muted">Stage</th>
                <th className="px-4 py-3 font-medium text-muted">Updated</th>
              </tr>
            </thead>
            <tbody>
              {content.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/${item.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {item.title}
                    </Link>
                    {item.tags.length > 0 && (
                      <span className="ml-2 text-xs text-muted">
                        {item.tags[0]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {item.content_type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stageBadgeColor[item.stage] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {item.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
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
