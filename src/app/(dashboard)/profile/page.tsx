import { getProfile } from "@/app/actions/profile";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getProfile();

  if (!profile || !profile.niche || !profile.channel_goal) {
    redirect("/profile/setup");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted">
          Update your channel details and content preferences.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
