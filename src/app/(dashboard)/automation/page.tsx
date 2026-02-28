import { createAdminClient } from "@/lib/supabase/admin";
import type { CronRun } from "@/lib/types";
import Link from "next/link";

const statusColor: Record<string, string> = {
  success: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
  running: "bg-warning/10 text-warning",
};

const publishStatusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  published: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
};

const thClass =
  "px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted";
const tdClass = "px-4 py-3 text-[13px] text-muted";

export default async function AutomationPage() {
  const supabase = createAdminClient();

  const [cronRunsRes, pipelineRes, failedRes] = await Promise.all([
    supabase
      .from("cron_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("youtube_videos")
      .select(
        "id, video_id, title, created_at, content:content_id(id, title, stage, blog_body)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("publishing_records")
      .select(
        "id, platform, status, error, created_at, content:content_id(id, title)",
      )
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const cronRuns = cronRunsRes.data ?? [];
  const pipeline = pipelineRes.data ?? [];
  const failed = failedRes.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Automation
      </h1>

      {/* Cron Runs */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Latest Cron Runs
        </h2>
        {cronRuns.length === 0 ? (
          <p className="text-[13px] text-muted">No cron runs recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Started</th>
                  <th className={thClass}>Duration</th>
                  <th className={thClass}>Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cronRuns.map((run: CronRun) => (
                  <tr key={run.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          statusColor[run.status] ?? "bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className={tdClass}>
                      {new Date(run.started_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className={tdClass}>
                      {run.duration_ms !== null
                        ? `${(run.duration_ms / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                    <td className={tdClass}>
                      {run.error ? (
                        <span className="text-error">
                          {truncate(run.error, 80)}
                        </span>
                      ) : run.summary ? (
                        <span>
                          {run.summary.polled ?? 0} new,{" "}
                          {run.summary.transcribed ?? 0} transcribed,{" "}
                          {run.summary.blogGenerated ?? 0} blog,{" "}
                          {run.summary.published ?? 0} published
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* YouTube Pipeline */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
          YouTube Pipeline Status
        </h2>
        {pipeline.length === 0 ? (
          <p className="text-[13px] text-muted">
            No YouTube videos ingested yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={thClass}>Video</th>
                  <th className={thClass}>Transcript</th>
                  <th className={thClass}>Blog</th>
                  <th className={thClass}>Stage</th>
                  <th className={thClass}>Ingested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pipeline.map(
                  (row: {
                    id: string;
                    video_id: string;
                    title: string;
                    created_at: string;
                    content: {
                      id: string;
                      title: string;
                      stage: string;
                      blog_body: string | null;
                    }[];
                  }) => {
                    const content = row.content?.[0] ?? null;
                    return (
                      <tr key={row.id} className="hover:bg-surface-2 transition-colors">
                        <td className="px-4 py-3">
                          <a
                            href={`https://youtube.com/watch?v=${row.video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium text-foreground hover:text-accent transition-colors"
                          >
                            {truncate(row.title, 50)}
                          </a>
                        </td>
                        <td className={tdClass}>
                          {content ? (
                            <span className="text-success">done</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={tdClass}>
                          {content?.blog_body ? (
                            <span className="text-success">done</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {content ? (
                            <Link
                              href={`/content/${content.id}`}
                              className="inline-block rounded bg-zinc-500/10 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 hover:text-accent transition-colors"
                            >
                              {content.stage}
                            </Link>
                          ) : (
                            <span className={tdClass}>—</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Failed Items */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
          Failed Items
        </h2>
        {failed.length === 0 ? (
          <p className="text-[13px] text-muted">No failed items.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={thClass}>Content</th>
                  <th className={thClass}>Platform</th>
                  <th className={thClass}>Error</th>
                  <th className={thClass}>When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {failed.map(
                  (rec: {
                    id: string;
                    platform: string;
                    status: string;
                    error: string | null;
                    created_at: string;
                    content: { id: string; title: string }[];
                  }) => (
                    <tr key={rec.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        {rec.content?.[0] ? (
                          <Link
                            href={`/content/${rec.content[0].id}`}
                            className="text-[13px] font-medium text-foreground hover:text-accent transition-colors"
                          >
                            {truncate(rec.content[0].title, 40)}
                          </Link>
                        ) : (
                          <span className="text-[13px] text-muted">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            publishStatusColor[rec.status] ??
                            "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {rec.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-error">
                        {rec.error ? truncate(rec.error, 60) : "—"}
                      </td>
                      <td className={tdClass}>
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
