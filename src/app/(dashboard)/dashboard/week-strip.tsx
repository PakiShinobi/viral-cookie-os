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

  const days: { label: string; date: string; isToday: boolean }[] = [];
  const today = formatDate(new Date());

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    days.push({
      label: DAY_LABELS[i],
      date: dateStr,
      isToday: dateStr === today,
    });
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">This Week</h3>
      </div>
      <div className="grid grid-cols-7 divide-x divide-slate-800">
        {days.map((day) => {
          const daySlots = slotsByDate.get(day.date) ?? [];
          return (
            <div key={day.date} className="min-h-[80px] p-2">
              <p
                className={`text-xs font-medium ${
                  day.isToday ? "text-accent" : "text-slate-500"
                }`}
              >
                {day.label}
              </p>
              <div className="mt-1.5 space-y-1">
                {daySlots.map((slot) => {
                  const title = slot.title_idea?.title ?? "Untitled";
                  const href = slot.content_id
                    ? `/content/${slot.content_id}`
                    : `/calendar`;
                  return (
                    <Link
                      key={slot.id}
                      href={href}
                      className="block truncate rounded bg-slate-800 px-1.5 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
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
