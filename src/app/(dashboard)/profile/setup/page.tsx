import { getProfile } from "@/app/actions/profile";
import { redirect } from "next/navigation";
import { ProfileForm } from "../profile-form";

export default async function ProfileSetupPage() {
  const profile = await getProfile();

  // If profile already complete, skip setup
  if (profile && profile.niche && profile.channel_goal) {
    redirect("/content");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Set up your profile
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tell us about your channel so we can tailor content generation to your
          style.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
