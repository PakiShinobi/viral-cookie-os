"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import {
  isAuthDisabled,
  getMockUser,
  assertAuthWritesAllowed,
} from "@/lib/auth/auth-bypass";
import { redirect } from "next/navigation";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const { data } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<Profile>();

  return data;
}

export async function upsertProfile(formData: FormData) {
  assertAuthWritesAllowed();

  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
  }

  const niche = (formData.get("niche") as string)?.trim() ?? "";
  const channelGoal = (formData.get("channel_goal") as string)?.trim() ?? "";

  if (!niche || !channelGoal) {
    throw new Error("Niche and channel goal are required");
  }

  // Collect CTAs from numbered form fields
  const ctas: string[] = [];
  for (let i = 0; i < 10; i++) {
    const val = (formData.get(`cta_${i}`) as string)?.trim();
    if (val) ctas.push(val);
  }

  const profileData = {
    user_id: userId,
    youtube_channel_url:
      (formData.get("youtube_channel_url") as string)?.trim() || null,
    youtube_channel_id:
      (formData.get("youtube_channel_id") as string)?.trim() || null,
    niche,
    channel_goal: channelGoal,
    ctas,
    tone: (formData.get("tone") as string)?.trim() ?? "",
    audience: (formData.get("audience") as string)?.trim() ?? "",
  };

  const { error } = await supabase
    .from("profile")
    .upsert(profileData, { onConflict: "user_id" });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/content");
}
