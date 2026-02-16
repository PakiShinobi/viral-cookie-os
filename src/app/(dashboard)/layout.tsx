import { createServerClient } from "@/lib/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profile gating: redirect to setup if profile incomplete
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isSetupPage = pathname === "/profile/setup";

  if (!isSetupPage) {
    const { data: profile } = await supabase
      .from("profile")
      .select("niche, channel_goal")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || !profile.niche || !profile.channel_goal) {
      redirect("/profile/setup");
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar email={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto bg-slate-950 p-8">{children}</main>
    </div>
  );
}
