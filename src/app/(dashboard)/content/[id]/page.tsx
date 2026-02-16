import { createServerClient } from "@/lib/supabase";
import type { Content } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GenerateScript } from "./generate-script";

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

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: item } = await supabase
    .from("content")
    .select("*")
    .eq("id", id)
    .single<Content>();

  if (!item) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/content"
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back to content
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{item.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stageBadgeColor[item.stage] ?? "bg-gray-100 text-gray-600"}`}
            >
              {item.stage}
            </span>
            <span className="text-sm text-muted">
              {item.content_type.replace("_", " ")}
            </span>
            {item.tags.length > 0 && (
              <span className="text-sm text-muted">{item.tags[0]}</span>
            )}
          </div>
        </div>
      </div>

      {item.brief && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-muted">Notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{item.brief}</p>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium">Script</h2>
        </div>

        <div className="p-4">
          {item.script ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {item.script}
            </div>
          ) : (
            <GenerateScript contentId={item.id} />
          )}
        </div>
      </div>

      {item.script && (
        <div className="mt-4">
          <GenerateScript contentId={item.id} hasExisting />
        </div>
      )}
    </div>
  );
}
