import { isAuthDisabled } from "@/lib/auth/auth-bypass";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Editor route group.
 *
 * Full-bleed surface — no dashboard sidebar. The editor and import studio
 * use the entire viewport so the timeline and canvas have room to breathe.
 *
 * Auth is gated identically to the dashboard layout (mock user when
 * AUTH_DISABLED, real Supabase user otherwise).
 */
export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthDisabled()) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
