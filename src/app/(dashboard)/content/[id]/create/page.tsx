import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { getWizardSession, createWizardSession } from "@/app/actions/wizard";
import WizardLayout from "./wizard-layout";

interface Props {
  params: { id: string };
}

export default async function WizardPage({ params }: Props) {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return notFound();
  }

  // Verify content belongs to user
  const { data: content, error: contentError } = await supabase
    .from("content")
    .select("id, title")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (contentError || !content) {
    return notFound();
  }

  // Get or create wizard session
  let session = await getWizardSession(params.id);

  if (!session || "error" in session) {
    session = await createWizardSession(params.id);
  }

  if (!session || "error" in session) {
    return notFound();
  }

  return (
    <WizardLayout
      contentId={params.id}
      contentTitle={content.title}
      currentStep={session.current_step}
    />
  );
}