/**
 * Auth bypass module — single source of truth for dev/staging bypass mode.
 *
 * Enable bypass (set in .env.local):
 *   NEXT_PUBLIC_AUTH_DISABLED=true   works in browser, Edge middleware, and server
 *   AUTH_DISABLED=true               server + Edge only (not visible to client components)
 *
 * Enable writes while bypassed (set in .env.local):
 *   AUTH_BYPASS_ALLOW_WRITES=true
 *
 * When neither is set: normal Supabase auth applies everywhere.
 */

export type MockUser = { id: string; email: string; role: string };

export type MockProfile = {
  niche: string;
  channel_goal: string;
  tone: string;
  audience: string;
};

const TRUTHY = new Set(["true", "1", "yes", "on"]);

function isTruthy(val: string | undefined): boolean {
  return TRUTHY.has((val ?? "").toLowerCase());
}

export function isAuthDisabled(): boolean {
  return (
    isTruthy(process.env.AUTH_DISABLED) ||
    isTruthy(process.env.NEXT_PUBLIC_AUTH_DISABLED)
  );
}

export function isAuthBypassWriteAllowed(): boolean {
  return isTruthy(process.env.AUTH_BYPASS_ALLOW_WRITES);
}

export function getMockUser(): MockUser {
  return { id: "dev-user", email: "dev@viral.local", role: "dev" };
}

export function getMockProfile(): MockProfile {
  return {
    niche: "tech & productivity",
    channel_goal: "grow an audience of developers and creators",
    tone: "engaging and authentic",
    audience: "developers and indie creators",
  };
}

/**
 * Call at the top of any server action or route handler that performs a write
 * (insert / update / delete / storage upload).
 *
 * Throws when auth is disabled but AUTH_BYPASS_ALLOW_WRITES is not set,
 * preventing accidental writes to a real database under a mock identity.
 */
export function assertAuthWritesAllowed(): void {
  if (isAuthDisabled() && !isAuthBypassWriteAllowed()) {
    throw new Error(
      "[auth-bypass] Write blocked in bypass mode. " +
        "Add AUTH_BYPASS_ALLOW_WRITES=true to .env.local to allow writes.",
    );
  }
}
