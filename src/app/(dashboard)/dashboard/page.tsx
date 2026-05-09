import { createServerClient } from "@/lib/supabase/server";
import type {
  Content,
  CalendarSlot,
  CronRun,
  PublishingRecord,
} from "@/lib/types";
import Link from "next/link";
import { PageShell } from "@/components/ui/page-shell";
import { PodcastProjectsStrip } from "@/components/podcast/podcast-projects-strip";
import { MetricCard } from "./metric-card";
import { ActionQueue } from "./action-queue";
import { WeekStrip } from "./week-strip";
import { AutomationPanel } from "./automation-panel";

function getWeekBounds(): { monday: Date; sunday: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { monday, sunday } = getWeekBounds();
  const mondayStr = formatDate(monday);
  const sundayStr = formatDate(sunday);

  const [
    weekSlotsRes,
    scriptsReadyRes,
    readyToPublishRes,
    distributedRes,
    scriptQueueRes,
    reviewQueueRes,
    publishQueueRes,
    cronRunsRes,
    failedPublishingRes,
  ] = await Promise.all([
    // 1. Planned This Week
    supabase
      .from("calendar_slots")
      .select(
        `
        *,
        title_idea:title_ideas (
          id, title, video_style, target_duration_minutes, status, content_id
        )
      `,
      )
      .gte("slot_date", mondayStr)
      .lte("slot_date", sundayStr)
      .order("slot_date", { ascending: true })
      .returns<CalendarSlot[]>(),

    // 2. Scripts Ready count
    supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("stage", "script"),

    // 3. Ready to Publish count
    supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("stage", "publish"),

    // 4. Distributed count
    supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("stage", "distribute"),

    // 5a. Script queue
    supabase
      .from("content")
      .select("id, title")
      .eq("stage", "script")
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<Pick<Content, "id" | "title">[]>(),

    // 5b. Review queue
    supabase
      .from("content")
      .select("id, title")
      .eq("stage", "review")
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<Pick<Content, "id" | "title">[]>(),

    // 5c. Publish queue
    supabase
      .from("content")
      .select("id, title")
      .eq("stage", "publish")
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<Pick<Content, "id" | "title">[]>(),

    // 6a. Latest cron runs
    supabase
      .from("cron_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5)
      .returns<CronRun[]>(),

    // 6b. Failed publishing records
    supabase
      .from("publishing_records")
      .select("*")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<PublishingRecord[]>(),
  ]);

  const weekSlots = weekSlotsRes.data ?? [];
  const plannedCount = weekSlots.length;
  const scriptsReadyCount = scriptsReadyRes.count ?? 0;
  const readyToPublishCount = readyToPublishRes.count ?? 0;
  const distributedCount = distributedRes.count ?? 0;

  const scriptQueue = scriptQueueRes.data ?? [];
  const reviewQueue = reviewQueueRes.data ?? [];
  const publishQueue = publishQueueRes.data ?? [];

  const cronRuns = cronRunsRes.data ?? [];
  const failedPublishing = failedPublishingRes.data ?? [];

  const today = new Date();
  const dateDisplay = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Command Centre
          </h1>
          <p className="mt-1 text-sm text-muted">{dateDisplay}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/podcast/new"
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            New Podcast
          </Link>
          <Link
            href="/content/new"
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            New Content
          </Link>
        </div>
      </div>

      {/* Podcast Studio strip — primary product surfaces first */}
      <PodcastProjectsStrip />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard value={plannedCount} label="Planned This Week" />
        <MetricCard value={scriptsReadyCount} label="Scripts Ready" />
        <MetricCard value={readyToPublishCount} label="Ready to Publish" />
        <MetricCard value={distributedCount} label="Distributed" />
      </div>

      {/* Action Queues */}
      <div className="grid gap-3 md:grid-cols-3">
        <ActionQueue
          title="Needs Script"
          items={scriptQueue}
          emptyText="No items in script stage"
        />
        <ActionQueue
          title="Needs Review"
          items={reviewQueue}
          emptyText="No items in review stage"
        />
        <ActionQueue
          title="Ready to Publish"
          items={publishQueue}
          emptyText="No items ready to publish"
        />
      </div>

      {/* Week Strip */}
      <WeekStrip slots={weekSlots} weekStart={monday} />

      {/* Automation Panel */}
      <AutomationPanel
        cronRuns={cronRuns}
        failedPublishing={failedPublishing}
      />
    </PageShell>
  );
}
