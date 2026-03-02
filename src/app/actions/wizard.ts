"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { WizardStep } from "@/lib/types";
import {
  isAuthDisabled,
  getMockUser,
  assertAuthWritesAllowed,
} from "@/lib/auth/auth-bypass";

/* ===========================
   Create Wizard Session
=========================== */
export async function createWizardSession(contentId: string) {
  assertAuthWritesAllowed();

  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };
    userId = user.id;
  }

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
      user_id: userId,
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
    .from("wizard_sessions")
    .select("*")
    .eq("content_id", contentId)
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

/* ===========================
   Advance Wizard Step
=========================== */
export async function advanceWizardStep(contentId: string, nextStep: WizardStep) {
  assertAuthWritesAllowed();

  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };
    userId = user.id;
  }

  const { error } = await supabase
    .from("wizard_sessions")
    .update({ current_step: nextStep })
    .eq("content_id", contentId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  return { success: true };
}

/* ===========================
   Complete Wizard
=========================== */
export async function completeWizard(contentId: string) {
  assertAuthWritesAllowed();

  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };
    userId = user.id;
  }

  const { error } = await supabase
    .from("wizard_sessions")
    .update({
      status: "complete",
      current_step: "complete",
    })
    .eq("content_id", contentId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  redirect(`/content/${contentId}`);
}

/* ===========================
   Update Content Title
=========================== */
export async function updateContentTitle(contentId: string, title: string) {
  assertAuthWritesAllowed();

  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };
    userId = user.id;
  }

  const { error } = await supabase
    .from("content")
    .update({ title })
    .eq("id", contentId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  return { success: true };
}
