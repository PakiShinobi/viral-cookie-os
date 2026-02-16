import { createServerClient } from "@/lib/supabase";
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

  // Current month boundaries
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Content Calendar &mdash;{" "}
          {firstDay.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h1>
        <Link
          href="/titles"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          + Generate Titles
        </Link>
      </div>

      {slots.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted">No scheduled content this month</p>
          <Link
            href="/titles"
            className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover"
          >
            Generate titles and plan your calendar
          </Link>
        </div>
      ) : (
        <CalendarGrid
          slots={slots}
          year={year}
          month={month}
        />
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
