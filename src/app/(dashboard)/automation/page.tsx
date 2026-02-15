import { createAdminClient } from "@/lib/supabase";
import type { CronRun } from "@/lib/types";
import Link from "next/link";

const statusColor: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  running: "bg-blue-100 text-blue-700",
};

const publishStatusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default async function AutomationPage() {
  const supabase = createAdminClient();

  // Fetch data in parallel
  const [cronRunsRes, pipelineRes, failedRes] = await Promise.all([
    // 1. Latest cron runs
    supabase
      .from("cron_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10),

    // 2. YouTube pipeline status (recent youtube_videos with content + publishing)
    supabase
      .from("youtube_videos")
      .select(
        "id, video_id, title, created_at, content:content_id(id, title, stage, blog_body)",
      )
      .order("created_at", { ascending: false })
      .limit(20),

    // 3. Failed publishing records
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
    <div>
      <h1 className="text-xl font-bold">Automation</h1>

      {/* Section 1: Latest Cron Runs */}
      <section className="mt-6">
        <h2 className="text-sm font-medium text-muted">Latest Cron Runs</h2>
        {cronRuns.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No cron runs recorded yet.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <th className="px-4 py-3 font-medium text-muted">Status</th>
                  <th className="px-4 py-3 font-medium text-muted">Started</th>
                  <th className="px-4 py-3 font-medium text-muted">
                    Duration
                  </th>
                  <th className="px-4 py-3 font-medium text-muted">Summary</th>
                </tr>
              </thead>
              <tbody>
                {cronRuns.map((run: CronRun) => (
                  <tr
                    key={run.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[run.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(run.started_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {run.duration_ms !== null
                        ? `${(run.duration_ms / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {run.error ? (
                        <span className="text-red-600">
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

      {/* Section 2: YouTube Pipeline Status */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted">
          YouTube Pipeline Status
        </h2>
        {pipeline.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No YouTube videos ingested yet.
          </p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <th className="px-4 py-3 font-medium text-muted">Video</th>
                  <th className="px-4 py-3 font-medium text-muted">
                    Transcript
                  </th>
                  <th className="px-4 py-3 font-medium text-muted">Blog</th>
                  <th className="px-4 py-3 font-medium text-muted">Stage</th>
                  <th className="px-4 py-3 font-medium text-muted">
                    Ingested
                  </th>
                </tr>
              </thead>
              <tbody>
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
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <a
                            href={`https://youtube.com/watch?v=${row.video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-accent"
                          >
                            {truncate(row.title, 50)}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {content ? (
                            <span className="text-green-600">done</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {content?.blog_body ? (
                            <span className="text-green-600">done</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {content ? (
                            <Link
                              href={`/content/${content.id}`}
                              className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:text-accent"
                            >
                              {content.stage}
                            </Link>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">
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

      {/* Section 3: Failed Items */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted">Failed Items</h2>
        {failed.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No failed items.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <th className="px-4 py-3 font-medium text-muted">Content</th>
                  <th className="px-4 py-3 font-medium text-muted">
                    Platform
                  </th>
                  <th className="px-4 py-3 font-medium text-muted">Error</th>
                  <th className="px-4 py-3 font-medium text-muted">When</th>
                </tr>
              </thead>
              <tbody>
                {failed.map(
                  (rec: {
                    id: string;
                    platform: string;
                    status: string;
                    error: string | null;
                    created_at: string;
                    content: { id: string; title: string }[];
                  }) => (
                    <tr
                      key={rec.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        {rec.content?.[0] ? (
                          <Link
                            href={`/content/${rec.content[0].id}`}
                            className="font-medium hover:text-accent"
                          >
                            {truncate(rec.content[0].title, 40)}
                          </Link>
                        ) : (
                          <span className="text-muted">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${publishStatusColor[rec.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {rec.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-red-600">
                        {rec.error ? truncate(rec.error, 60) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
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
