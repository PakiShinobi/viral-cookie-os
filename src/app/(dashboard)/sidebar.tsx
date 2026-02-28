"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const DashboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".8" />
    <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".8" />
    <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".8" />
    <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity=".8" />
  </svg>
);

const ContentIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="4.5" y1="5" x2="10.5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="7.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const TitlesIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M7.5 1.5L8.8 5.1H12.6L9.4 7.4L10.7 11L7.5 8.7L4.3 11L5.6 7.4L2.4 5.1H6.2L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <line x1="1.5" y1="6" x2="13.5" y2="6" stroke="currentColor" strokeWidth="1.2" />
    <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const AutomationIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M8.5 1.5L4 8.5H7.5L6.5 13.5L11 6.5H7.5L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 13C2 10.2386 4.46243 8 7.5 8C10.5376 8 13 10.2386 13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const links = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/content", label: "Content", Icon: ContentIcon },
  { href: "/titles", label: "Titles", Icon: TitlesIcon },
  { href: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/automation", label: "Automation", Icon: AutomationIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 py-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-accent">
            <span className="text-[10px] font-bold text-white">VC</span>
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            Viral Cookie OS
          </span>
        </div>
      </div>

      <nav className="flex-1 p-2">
        <ul className="space-y-0.5">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <link.Icon />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-4 py-4">
        <p className="truncate text-[11px] text-muted">{email}</p>
        <button
          onClick={handleSignOut}
          className="mt-1.5 text-[11px] text-muted transition-colors hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
