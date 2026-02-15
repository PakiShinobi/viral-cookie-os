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
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted">
        Tell us about your channel so we can tailor content generation to your
        style.
      </p>
      <div className="mt-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
