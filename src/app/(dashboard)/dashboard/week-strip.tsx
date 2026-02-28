import type { CalendarSlot } from "@/lib/types";
import Link from "next/link";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekStrip({
  slots,
  weekStart,
}: {
  slots: CalendarSlot[];
  weekStart: Date;
}) {
  const slotsByDate = new Map<string, CalendarSlot[]>();
  for (const slot of slots) {
    const existing = slotsByDate.get(slot.slot_date) ?? [];
    existing.push(slot);
    slotsByDate.set(slot.slot_date, existing);
  }

  const today = formatDate(new Date());
  const days: { label: string; dayNum: number; date: string; isToday: boolean }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    days.push({
      label: DAY_LABELS[i],
      dayNum: d.getDate(),
      date: dateStr,
      isToday: dateStr === today,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-semibold text-foreground">This Week</h3>
      </div>
      <div className="grid grid-cols-7 divide-x divide-border">
        {days.map((day) => {
          const daySlots = slotsByDate.get(day.date) ?? [];
          return (
            <div key={day.date} className="min-h-[88px] p-2.5">
              <div className="mb-2 flex flex-col items-start">
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider ${
                    day.isToday ? "text-accent" : "text-muted"
                  }`}
                >
                  {day.label}
                </span>
                <span
                  className={`text-[13px] font-semibold tabular-nums ${
                    day.isToday ? "text-accent" : "text-foreground"
                  }`}
                >
                  {day.dayNum}
                </span>
              </div>
              <div className="space-y-1">
                {daySlots.map((slot) => {
                  const title = slot.title_idea?.title ?? "Untitled";
                  const href = slot.content_id
                    ? `/content/${slot.content_id}`
                    : `/calendar`;
                  return (
                    <Link
                      key={slot.id}
                      href={href}
                      className="block truncate rounded bg-surface-2 px-1.5 py-1 text-[11px] text-muted transition-colors hover:text-foreground"
                      title={title}
                    >
                      {title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
