"use server";

import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import type { WizardStep } from "@/lib/types";

/* ===========================
   Create Wizard Session
=========================== */
export async function createWizardSession(contentId: string) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Check if session already exists
  const { data: existing } = await supabase
    .from("wizard_sessions")
    .select("id")
    .eq("content_id", contentId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("wizard_sessions")
    .insert({
      user_id: user.id,
      content_id: contentId,
      current_step: "title",
      status: "in_progress",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return data;
}

/* ===========================
   Get Wizard Session
=========================== */
export async function getWizardSession(contentId: string) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("wizard_sessions")
    .select("*")
    .eq("content_id", contentId)
    .eq("user_id", user.id)
    .maybeSingle();

  return data;
}

/* ===========================
   Advance Wizard Step
=========================== */
export async function advanceWizardStep(
  contentId: string,
  nextStep: WizardStep
) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("wizard_sessions")
    .update({
      current_step: nextStep,
    })
    .eq("content_id", contentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  return { success: true };
}

/* ===========================
   Complete Wizard
=========================== */
export async function completeWizard(contentId: string) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("wizard_sessions")
    .update({
      status: "complete",
      current_step: "complete",
    })
    .eq("content_id", contentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  redirect(`/content/${contentId}`);
}
