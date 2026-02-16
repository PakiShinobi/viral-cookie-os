import type { CronRun, PublishingRecord } from "@/lib/types";

const cronStatusColor: Record<string, string> = {
  success: "bg-green-900/50 text-green-400",
  failed: "bg-red-900/50 text-red-400",
  running: "bg-yellow-900/50 text-yellow-400",
};

const publishStatusColor: Record<string, string> = {
  pending: "bg-yellow-900/50 text-yellow-400",
  published: "bg-green-900/50 text-green-400",
  failed: "bg-red-900/50 text-red-400",
};

export function AutomationPanel({
  cronRuns,
  failedPublishing,
}: {
  cronRuns: CronRun[];
  failedPublishing: PublishingRecord[];
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Cron Runs */}
      <div className="rounded-lg border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">
            Recent Automations
          </h3>
        </div>
        <div className="p-2">
          {cronRuns.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-500">
              No automation runs yet
            </p>
          ) : (
            <ul className="space-y-0.5">
              {cronRuns.map((run) => (
                <li
                  key={run.id}
                  className="flex items-center justify-between rounded-md px-3 py-2"
                >
                  <span className="truncate text-sm text-slate-300">
                    {run.route}
                  </span>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
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

      {/* Failed Publishing */}
      <div className="rounded-lg border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">
            Failed Publishing
          </h3>
        </div>
        <div className="p-2">
          {failedPublishing.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-500">
              No failures
            </p>
          ) : (
            <ul className="space-y-0.5">
              {failedPublishing.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between rounded-md px-3 py-2"
                >
                  <span className="truncate text-sm text-slate-300">
                    {record.platform} &middot;{" "}
                    {record.error ?? "Unknown error"}
                  </span>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
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
