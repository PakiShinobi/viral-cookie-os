import type { CronRun, PublishingRecord } from "@/lib/types";

const cronStatusColor: Record<string, string> = {
  success: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
  running: "bg-warning/10 text-warning",
};

const publishStatusColor: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  published: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
};

export function AutomationPanel({
  cronRuns,
  failedPublishing,
}: {
  cronRuns: CronRun[];
  failedPublishing: PublishingRecord[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[13px] font-semibold text-foreground">
            Recent Automations
          </h3>
        </div>
        <div className="p-1.5">
          {cronRuns.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted">
              No automation runs yet
            </p>
          ) : (
            <ul>
              {cronRuns.map((run) => (
                <li
                  key={run.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                >
                  <span className="truncate text-[13px] text-muted">
                    {run.route}
                  </span>
                  <span
                    className={`ml-3 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      cronStatusColor[run.status] ?? cronStatusColor.running
                    }`}
                  >
                    {run.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[13px] font-semibold text-foreground">
            Failed Publishing
          </h3>
        </div>
        <div className="p-1.5">
          {failedPublishing.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted">No failures</p>
          ) : (
            <ul>
              {failedPublishing.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                >
                  <span className="truncate text-[13px] text-muted">
                    {record.platform} &middot; {record.error ?? "Unknown error"}
                  </span>
                  <span
                    className={`ml-3 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      publishStatusColor[record.status] ??
                      publishStatusColor.failed
                    }`}
                  >
                    {record.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
