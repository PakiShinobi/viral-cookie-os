"use client";

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const links = [
    { href: "/content", label: "Content" },
    { href: "/automation", label: "Automation" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-sm font-bold tracking-tight">Viral Cookie OS</h1>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-surface text-foreground"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="truncate text-xs text-muted">{email}</p>
        <button
          onClick={handleSignOut}
          className="mt-2 text-xs text-muted transition-colors hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
