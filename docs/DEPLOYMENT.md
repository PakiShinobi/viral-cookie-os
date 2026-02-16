# Deployment

## Infrastructure

| Component | Service |
|---|---|
| Application | Vercel (Pro plan) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Edge Functions | Supabase Edge Functions (transcription) |

Two services. That's it.

## Environments

| Environment | URL | Supabase Project |
|---|---|---|
| **Production** | `app.viralcookieos.com` | `viral-cookie-os-prod` |
| **Preview** | `*.vercel.app` (per-PR) | `viral-cookie-os-dev` |
| **Local** | `localhost:3000` | `viral-cookie-os-dev` |

Preview and local share the same Supabase development project. Production uses a separate project with its own database and storage.

## Environment Variables

Stored in Vercel's environment variable settings. Never committed to the repository.

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase public anon key
SUPABASE_SERVICE_ROLE_KEY=       # Server-only, never exposed to client

# AI
ANTHROPIC_API_KEY=               # Claude API key

# Publishing - YouTube
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# Publishing - Shopify
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
```

`NEXT_PUBLIC_` prefixed variables are safe for the browser -- the anon key is designed to be public and is restricted by RLS policies. All other keys are server-only.

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

Triggered on every push to a branch with an open PR:

```
Install → Lint → Type Check → Test → Preview Deploy
```

1. `pnpm install --frozen-lockfile`
2. `pnpm lint` (ESLint)
3. `pnpm type-check` (tsc --noEmit)
4. `pnpm test` (Vitest)
5. Vercel auto-deploys a preview URL from the GitHub integration.

### Production Deploy

Merging to `main` triggers:

1. Same CI checks as above.
2. Supabase migrations applied via `supabase db push` (run manually or from CI with the Supabase CLI).
3. Vercel builds and deploys to production.

### Database Migrations

Migrations are managed with the Supabase CLI:

```bash
# Create a new migration
supabase migration new <name>

# Apply migrations locally
supabase db reset

# Push migrations to production
supabase db push
```

Migration files live in `supabase/migrations/`. Each migration is a plain SQL file.

Before pushing to production, test migrations locally with `supabase db reset` which drops and recreates the local database from migrations.

## Vercel Configuration

Vercel auto-detects the Next.js framework. No `vercel.json` needed for the MVP. Settings configured in the Vercel dashboard:

- **Framework**: Next.js
- **Build command**: `pnpm build`
- **Root directory**: `/`
- **Node.js version**: 20.x
- **Region**: US East (closest to Supabase, default `us-east-1`)

### Custom Domain

- `viralcookieos.com` → Vercel (marketing/landing)
- `app.viralcookieos.com` → Vercel (application)

DNS is managed wherever the domain is registered. CNAME records point to Vercel.

## Supabase Configuration

### Database

- Region: US East (matches Vercel)
- Connection pooling: enabled via Supavisor (transaction mode)
- RLS: enabled on all application tables
- Extensions: `pgcrypto` (UUID generation), `pg_trgm` (fuzzy text search)

### Storage

One private bucket: `media`

- Max file size: 5 GB (video uploads)
- Allowed MIME types: `video/*`, `audio/*`, `image/*`
- Signed URL expiry: 1 hour for reads, 10 minutes for uploads

### Auth

- Providers: Google OAuth, magic link (email)
- Redirect URL: `https://app.viralcookieos.com/auth/callback`
- Session duration: 1 week
- JWT expiry: 1 hour (auto-refreshed by `@supabase/ssr`)

### Edge Functions

Deployed via the Supabase CLI:

```bash
supabase functions deploy transcribe
```

Edge Functions run on Deno Deploy. The `transcribe` function is the only edge function in the MVP -- it receives a media file reference, calls a transcription API, and writes results back to the `transcripts` table.

## Monitoring

### Vercel

- **Analytics**: enabled for Core Web Vitals and page-level performance.
- **Logs**: real-time function logs in the Vercel dashboard. Filter by route, status code, duration.
- **Alerts**: email alerts on deployment failure.

### Supabase

- **Dashboard**: built-in query performance monitoring, active connections, storage usage.
- **Logs**: Postgres logs, Auth logs, Storage logs, and Edge Function logs all accessible from the Supabase dashboard.
- **Alerts**: email alerts on database size thresholds and auth anomalies.

### Error Tracking

For the MVP, errors are logged via `console.error` in server-side code and visible in Vercel function logs. Sentry or a similar service can be added when the team grows.

## Rollback

- **Application**: Vercel supports instant rollback to any previous deployment from the dashboard.
- **Database**: Supabase provides daily backups on the Pro plan. Point-in-time recovery is available on Team plan and above. For the MVP, maintain backward-compatible migrations and test with `supabase db reset` before pushing.

## Cost Estimate (MVP)

| Service | Plan | Estimated Monthly Cost |
|---|---|---|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| Claude API | Pay-as-you-go | $50-200 (depends on usage) |
| YouTube API | Free tier | $0 |
| Shopify API | Free (partner/dev) | $0 |
| **Total** | | **$95-245/mo** |
