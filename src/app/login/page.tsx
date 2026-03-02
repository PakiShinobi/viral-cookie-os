"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent";

// NEXT_PUBLIC vars are inlined at build time — safe to read at module level.
const isAuthBypassed =
  process.env.NEXT_PUBLIC_AUTH_DISABLED === "true" ||
  process.env.NEXT_PUBLIC_AUTH_DISABLED === "1" ||
  process.env.NEXT_PUBLIC_AUTH_DISABLED === "yes" ||
  process.env.NEXT_PUBLIC_AUTH_DISABLED === "on";

export default function LoginPage() {
  const supabase = createBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <span className="text-xs font-bold text-white">VC</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Viral Cookie OS
          </span>
        </div>

        {/* Auth bypass banner */}
        {isAuthBypassed && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <span className="text-[12px] text-amber-600 dark:text-amber-400">
              Auth bypass enabled
            </span>
            <Link
              href="/dashboard"
              className="text-[12px] font-medium text-amber-600 underline underline-offset-2 hover:text-amber-500 dark:text-amber-400"
            >
              Go to dashboard →
            </Link>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-7">
          <h1 className="mb-1 text-[17px] font-semibold text-foreground">
            Sign in
          </h1>
          <p className="mb-6 text-[13px] text-muted">
            Welcome back. Enter your credentials to continue.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-[13px] text-error">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <button
                type="button"
                onClick={handleSignup}
                disabled={loading}
                className="w-full rounded-lg border border-border py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
              >
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
