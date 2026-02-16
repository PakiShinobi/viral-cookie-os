import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { getWizardSession, createWizardSession } from "@/app/actions/wizard";
import WizardLayout from "./wizard-layout";

interface Props {
  params: { id: string };
}

export default async function WizardPage({ params }: Props) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  // Verify content belongs to user
  const { data: content } = await supabase
    .from("content")
    .select("id, title")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!content) return notFound();

  // Get or create wizard session
  let session = await getWizardSession(params.id);

  if (!session) {
    session = await createWizardSession(params.id);
  }

  return (
    <WizardLayout
      contentId={params.id}
      contentTitle={content.title}
      currentStep={session.current_step}
    />
  );
}
