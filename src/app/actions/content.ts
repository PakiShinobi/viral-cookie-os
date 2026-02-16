"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

export async function createContent(formData: FormData) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const niche = formData.get("niche") as string;
  const notes = formData.get("notes") as string;

  const { data, error } = await supabase
    .from("content")
    .insert({
      user_id: user.id,
      title,
      tags: niche ? [niche] : [],
      brief: notes || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/content/${data.id}`);
}

export async function updateContentScript(
  contentId: string,
  script: string,
  logData: {
    model: string;
    input_tokens: number;
    output_tokens: number;
  },
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error: updateError } = await supabase
    .from("content")
    .update({ script, stage: "script" })
    .eq("id", contentId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Use admin client to insert log since RLS checks auth.uid() which
  // may not match in server action context reliably for inserts
  const admin = createAdminClient();
  await admin.from("ai_generation_logs").insert({
    content_id: contentId,
    user_id: user.id,
    operation: "generate_script",
    model: logData.model,
    input_tokens: logData.input_tokens,
    output_tokens: logData.output_tokens,
    accepted: true,
  });
}

export async function deleteContent(contentId: string) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("content")
    .delete()
    .eq("id", contentId);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/content");
}
