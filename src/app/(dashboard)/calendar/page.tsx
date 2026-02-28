import { createServerClient } from "@/lib/supabase/server";
import type { CalendarSlot } from "@/lib/types";
import Link from "next/link";
import { CalendarGrid } from "./calendar-grid";

export default async function CalendarPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDate = formatDate(firstDay);
  const endDate = formatDate(lastDay);

  const { data } = await supabase
    .from("calendar_slots")
    .select(
      `
      *,
      title_idea:title_ideas (
        id,
        title,
        video_style,
        target_duration_minutes,
        status,
        content_id
      )
    `,
    )
    .eq("user_id", user.id)
    .gte("slot_date", startDate)
    .lte("slot_date", endDate)
    .order("slot_date", { ascending: true })
    .returns<CalendarSlot[]>();

  const slots = data ?? [];

  const monthLabel = firstDay.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {monthLabel}
        </h1>
        <Link
          href="/titles"
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Generate Titles
        </Link>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-16 text-center">
          <p className="text-sm text-muted">No scheduled content this month</p>
          <Link
            href="/titles"
            className="mt-3 inline-block text-[13px] font-medium text-accent hover:text-accent-hover"
          >
            Generate titles and plan your calendar
          </Link>
        </div>
      ) : (
        <CalendarGrid slots={slots} year={year} month={month} />
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
