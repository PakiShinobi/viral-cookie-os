"use server";

import { createServerClient } from "@/lib/supabase";
import type { Profile, TitleIdea, CalendarSlot } from "@/lib/types";
import Anthropic from "@anthropic-ai/sdk";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// generateTitles – calls Anthropic to produce title ideas
// ---------------------------------------------------------------------------

export async function generateTitles(input: {
  count: number;
  video_style: string;
  target_duration_minutes: number | null;
  topic_override?: string;
}): Promise<{ titles: string[] } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY not configured" };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profile")
    .select("niche, channel_goal, tone, audience")
    .eq("user_id", user.id)
    .single<Pick<Profile, "niche" | "channel_goal" | "tone" | "audience">>();

  if (!profile) {
    return { error: "Profile not found. Complete onboarding first." };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a YouTube title strategist. You generate high-converting video titles that optimize for click-through rate and viewer retention.

Rules:
- Titles must feel genuine, not spammy clickbait.
- Use curiosity gaps, specificity, and emotional triggers.
- Keep titles under 70 characters when possible.
- Vary sentence structures across titles.
- Return ONLY a valid JSON array of strings. No markdown, no explanation, no code fences.`;

  const userPrompt = `Generate exactly ${input.count} YouTube video title ideas.

Creator context:
- Niche: ${profile.niche}
- Channel goal: ${profile.channel_goal}
- Tone: ${profile.tone || "engaging and authentic"}
- Audience: ${profile.audience || "general"}
- Video style: ${input.video_style.replace("_", " ")}
${input.target_duration_minutes ? `- Target duration: ${input.target_duration_minutes} minutes` : ""}
${input.topic_override ? `- Specific topic: ${input.topic_override}` : ""}

Return a JSON array of exactly ${input.count} title strings. Example format:
["Title One","Title Two","Title Three"]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      temperature: 0.9,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strict JSON parse
    const trimmed = text.trim();
    let titles: string[];

    try {
      const parsed = JSON.parse(trimmed);
      if (
        !Array.isArray(parsed) ||
        !parsed.every((t: unknown) => typeof t === "string")
      ) {
        return { error: "AI returned invalid format. Please try again." };
      }
      titles = parsed as string[];
    } catch {
      // Fallback: try extracting JSON array from response
      const match = trimmed.match(/\[[\s\S]*\]/);
      if (!match) {
        return { error: "AI returned invalid format. Please try again." };
      }
      try {
        const parsed = JSON.parse(match[0]);
        if (
          !Array.isArray(parsed) ||
          !parsed.every((t: unknown) => typeof t === "string")
        ) {
          return { error: "AI returned invalid format. Please try again." };
        }
        titles = parsed as string[];
      } catch {
        return { error: "AI returned invalid format. Please try again." };
      }
    }

    return { titles: titles.slice(0, input.count) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `AI generation failed: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// createTitleIdeas – inserts title rows
// ---------------------------------------------------------------------------

export async function createTitleIdeas(input: {
  titles: string[];
  video_style: string;
  target_duration_minutes: number | null;
}): Promise<{ ideas: TitleIdea[] } | { error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rows = input.titles.map((title) => ({
    user_id: user.id,
    title,
    video_style: input.video_style,
    target_duration_minutes: input.target_duration_minutes,
  }));

  const { data, error } = await supabase
    .from("title_ideas")
    .insert(rows)
    .select()
    .returns<TitleIdea[]>();

  if (error) {
    return { error: error.message };
  }

  return { ideas: data ?? [] };
}

// ---------------------------------------------------------------------------
// planCalendar – creates calendar slots with deterministic distribution
// ---------------------------------------------------------------------------

export async function planCalendar(input: {
  videos_per_week: number;
  plan_months: number;
  titleIdeaIds: string[];
}): Promise<{ slots: CalendarSlot[] } | { error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Generate deterministic slot dates
  const slotDates = computeSlotDates(
    input.videos_per_week,
    input.plan_months,
  );

  // Build slot rows — assign title ideas in order, remaining slots stay empty
  const rows = slotDates.map((date, i) => ({
    user_id: user.id,
    slot_date: date,
    title_idea_id: i < input.titleIdeaIds.length ? input.titleIdeaIds[i] : null,
  }));

  const { data, error } = await supabase
    .from("calendar_slots")
    .insert(rows)
    .select()
    .returns<CalendarSlot[]>();

  if (error) {
    return { error: error.message };
  }

  return { slots: data ?? [] };
}

// ---------------------------------------------------------------------------
// computeSlotDates – deterministic date distribution
// ---------------------------------------------------------------------------

function computeSlotDates(
  videosPerWeek: number,
  planMonths: number,
): string[] {
  const dates: string[] = [];
  const today = new Date();

  // Start from tomorrow to avoid same-day scheduling
  const start = new Date(today);
  start.setDate(start.getDate() + 1);

  // End date: planMonths from today
  const end = new Date(today);
  end.setMonth(end.getMonth() + planMonths);

  // Walk week-by-week from start
  const cursor = new Date(start);
  // Align cursor to the next Monday
  const dayOfWeek = cursor.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  cursor.setDate(cursor.getDate() + daysUntilMonday);

  while (cursor <= end) {
    // Distribute N videos evenly across the 7-day week
    // For N videos, place them at day offsets: floor(i * 7 / N) for i=0..N-1
    for (let i = 0; i < videosPerWeek; i++) {
      const dayOffset = Math.floor((i * 7) / videosPerWeek);
      const slotDate = new Date(cursor);
      slotDate.setDate(slotDate.getDate() + dayOffset);

      if (slotDate <= end) {
        dates.push(formatDate(slotDate));
      }
    }

    // Advance to next Monday
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// generateAndPlan – orchestrates the full flow then redirects
// ---------------------------------------------------------------------------

export async function generateAndPlan(formData: FormData): Promise<string | null> {
  const count = Number(formData.get("count")) || 10;
  const video_style = (formData.get("video_style") as string) || "how_to";
  const rawDuration = formData.get("target_duration_minutes") as string;
  const target_duration_minutes = rawDuration ? Number(rawDuration) : null;
  const topic_override = (formData.get("topic_override") as string) || undefined;
  const videos_per_week = Number(formData.get("videos_per_week")) || 2;
  const plan_months = Number(formData.get("plan_months")) || 1;

  // Step 1: Generate titles
  const genResult = await generateTitles({
    count,
    video_style,
    target_duration_minutes,
    topic_override,
  });

  if ("error" in genResult) {
    return genResult.error;
  }

  // Step 2: Insert title ideas
  const ideasResult = await createTitleIdeas({
    titles: genResult.titles,
    video_style,
    target_duration_minutes,
  });

  if ("error" in ideasResult) {
    return ideasResult.error;
  }

  // Step 3: Plan calendar
  const titleIdeaIds = ideasResult.ideas.map((idea) => idea.id);
  const planResult = await planCalendar({
    videos_per_week,
    plan_months,
    titleIdeaIds,
  });

  if ("error" in planResult) {
    return planResult.error;
  }

  redirect("/calendar");
}
