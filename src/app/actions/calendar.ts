"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { CalendarSlot } from "@/lib/types";
import {
  isAuthDisabled,
  getMockUser,
  assertAuthWritesAllowed,
} from "@/lib/auth/auth-bypass";

// ---------------------------------------------------------------------------
// getCalendarRange – fetches slots with joined title_ideas for a date range
// ---------------------------------------------------------------------------

export async function getCalendarRange(input: {
  startDate: string;
  endDate: string;
}): Promise<{ slots: CalendarSlot[] } | { error: string }> {
  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    userId = user.id;
  }

  const { data, error } = await supabase
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
    .eq("user_id", userId)
    .gte("slot_date", input.startDate)
    .lte("slot_date", input.endDate)
    .order("slot_date", { ascending: true })
    .returns<CalendarSlot[]>();

  if (error) {
    return { error: error.message };
  }

  return { slots: data ?? [] };
}

// ---------------------------------------------------------------------------
// promoteSlotToContent – creates a content row from a calendar slot's title
// ---------------------------------------------------------------------------

export async function promoteSlotToContent(
  slotId: string,
): Promise<{ contentId: string } | { error: string }> {
  assertAuthWritesAllowed();

  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    userId = user.id;
  }

  // Fetch the slot
  const { data: slot, error: slotError } = await supabase
    .from("calendar_slots")
    .select("id, title_idea_id, content_id")
    .eq("id", slotId)
    .eq("user_id", userId)
    .single();

  if (slotError || !slot) {
    return { error: "Calendar slot not found" };
  }

  // If content already exists, return it
  if (slot.content_id) {
    return { contentId: slot.content_id };
  }

  // Fetch the linked title idea for the title text
  let title = "Untitled";
  if (slot.title_idea_id) {
    const { data: idea } = await supabase
      .from("title_ideas")
      .select("title")
      .eq("id", slot.title_idea_id)
      .single();

    if (idea) {
      title = idea.title;
    }
  }

  // Create content row
  const { data: content, error: contentError } = await supabase
    .from("content")
    .insert({
      user_id: userId,
      title,
      content_type: "video",
      stage: "idea",
    })
    .select("id")
    .single();

  if (contentError || !content) {
    return { error: contentError?.message ?? "Failed to create content" };
  }

  // Link content_id back to title_idea and calendar_slot
  if (slot.title_idea_id) {
    await supabase
      .from("title_ideas")
      .update({ content_id: content.id })
      .eq("id", slot.title_idea_id);
  }

  await supabase
    .from("calendar_slots")
    .update({ content_id: content.id, status: "in_progress" })
    .eq("id", slotId);

  return { contentId: content.id };
}
