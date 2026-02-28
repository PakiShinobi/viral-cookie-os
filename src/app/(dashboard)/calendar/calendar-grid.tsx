"use client";

import { promoteSlotToContent } from "@/app/actions/calendar";
import type { CalendarSlot } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusColors: Record<string, string> = {
  planned: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15",
  in_progress: "bg-orange-500/10 text-orange-400 hover:bg-orange-500/15",
  done: "bg-green-500/10 text-green-400 hover:bg-green-500/15",
  skipped: "bg-zinc-500/5 text-zinc-600 hover:bg-zinc-500/10",
};

export function CalendarGrid({
  slots,
  year,
  month,
}: {
  slots: CalendarSlot[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [promoting, setPromoting] = useState<string | null>(null);

  const slotsByDate = new Map<string, CalendarSlot[]>();
  for (const slot of slots) {
    const existing = slotsByDate.get(slot.slot_date) ?? [];
    existing.push(slot);
    slotsByDate.set(slot.slot_date, existing);
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  async function handleSlotClick(slot: CalendarSlot) {
    if (slot.content_id) {
      router.push(`/content/${slot.content_id}`);
      return;
    }
    setPromoting(slot.id);
    try {
      const result = await promoteSlotToContent(slot.id);
      if ("contentId" in result) {
        router.push(`/content/${result.contentId}`);
      }
    } finally {
      setPromoting(null);
    }
  }

  function dateKey(day: number): string {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const daySlots = day ? slotsByDate.get(dateKey(day)) ?? [] : [];
          const isToday =
            day !== null &&
            new Date().getFullYear() === year &&
            new Date().getMonth() === month &&
            new Date().getDate() === day;

          return (
            <div
              key={i}
              className={`min-h-[96px] border-b border-r border-border p-2 ${
                day === null ? "bg-surface-2/30" : ""
              }`}
            >
              {day !== null && (
                <>
                  <div
                    className={`mb-1.5 text-[12px] font-medium ${
                      isToday
                        ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white"
                        : "text-muted"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {daySlots.map((slot) => {
                      const title = slot.title_idea?.title ?? "Untitled slot";
                      const colors =
                        statusColors[slot.status] ?? statusColors.planned;
                      const isPromoting = promoting === slot.id;

                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotClick(slot)}
                          disabled={isPromoting}
                          className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] transition-colors disabled:opacity-50 ${colors}`}
                          title={title}
                        >
                          {isPromoting ? "Creating..." : title}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
