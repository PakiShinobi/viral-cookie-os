"use client";

import { promoteSlotToContent } from "@/app/actions/calendar";
import type { CalendarSlot } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const statusColors: Record<string, string> = {
  planned: "bg-blue-50 border-blue-200 text-blue-800",
  in_progress: "bg-orange-50 border-orange-200 text-orange-800",
  done: "bg-green-50 border-green-200 text-green-800",
  skipped: "bg-gray-50 border-gray-200 text-gray-500",
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

  // Build a map: "YYYY-MM-DD" -> CalendarSlot[]
  const slotsByDate = new Map<string, CalendarSlot[]>();
  for (const slot of slots) {
    const key = slot.slot_date;
    const existing = slotsByDate.get(key) ?? [];
    existing.push(slot);
    slotsByDate.set(key, existing);
  }

  // Build calendar grid cells
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday=0 offset (JS getDay: 0=Sun, 1=Mon, ...)
  const startDow = (firstDay.getDay() + 6) % 7; // Convert to Mon=0

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
    <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-surface">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted"
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
              className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                day === null ? "bg-surface/50" : ""
              }`}
            >
              {day !== null && (
                <>
                  <div
                    className={`mb-1 text-xs font-medium ${
                      isToday
                        ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white"
                        : "text-muted"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {daySlots.map((slot) => {
                      const title =
                        slot.title_idea?.title ?? "Untitled slot";
                      const colors =
                        statusColors[slot.status] ?? statusColors.planned;
                      const isPromoting = promoting === slot.id;

                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotClick(slot)}
                          disabled={isPromoting}
                          className={`w-full truncate rounded border px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80 disabled:opacity-50 ${colors}`}
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
