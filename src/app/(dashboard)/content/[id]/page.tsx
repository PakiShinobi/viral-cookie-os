import { createServerClient } from "@/lib/supabase/server";
import type { Content } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GenerateScript } from "./generate-script";

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/content"
          className="text-[13px] text-muted transition-colors hover:text-foreground"
        >
          ← Content
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {item.title}
        </h1>
        <div className="mt-3 flex items-center gap-2.5">
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
              stageBadgeColor[item.stage] ?? "bg-zinc-500/10 text-zinc-400"
            }`}
          >
            {item.stage}
          </span>
          <span className="text-[13px] text-muted capitalize">
            {item.content_type.replace(/_/g, " ")}
          </span>
          {item.tags.length > 0 && (
            <span className="text-[13px] text-muted">{item.tags[0]}</span>
          )}
        </div>
      </div>

      {item.brief && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {item.brief}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[13px] font-semibold text-foreground">Script</h2>
        </div>
        <div className="p-5">
          {item.script ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {item.script}
            </div>
          ) : (
            <GenerateScript contentId={item.id} />
          )}
        </div>
      </div>

      {item.script && (
        <div>
          <GenerateScript contentId={item.id} hasExisting />
        </div>
      )}
    </div>
  );
}
