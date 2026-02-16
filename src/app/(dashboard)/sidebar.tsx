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
    { href: "/dashboard", label: "Dashboard" },
    { href: "/content", label: "Content" },
    { href: "/titles", label: "Titles" },
    { href: "/calendar", label: "Calendar" },
    { href: "/automation", label: "Automation" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <aside className="flex w-56 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-4">
        <h1 className="text-sm font-bold tracking-tight text-white">
          Viral Cookie OS
        </h1>
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
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="truncate text-xs text-slate-500">{email}</p>
        <button
          onClick={handleSignOut}
          className="mt-2 text-xs text-slate-500 transition-colors hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
