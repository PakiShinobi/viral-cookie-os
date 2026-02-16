# Architecture

## System Overview

Viral Cookie OS is a monolithic Next.js application deployed on Vercel. Supabase provides the database (Postgres), file storage, and authentication. AI generation calls the Claude API directly from server-side route handlers. Publishing hits YouTube and Shopify APIs from the same application process.

There are no separate workers, job queues, or cache layers. Background work (transcription, publishing) is handled via Supabase Edge Functions triggered by database changes or called directly from the application.

```
┌─────────────────────────────────────┐
│         Next.js App Router          │
│  ┌───────────┐  ┌────────────────┐  │
│  │   Pages   │  │ Route Handlers │  │
│  │   (RSC)   │  │   (/api/...)   │  │
│  └───────────┘  └───┬────────────┘  │
│                     │               │
│  ┌──────────────────▼────────────┐  │
│  │        Server Actions         │  │
│  │  content · ai · media · pub   │  │
│  └──────────┬────────────────────┘  │
└─────────────┼───────────────────────┘
              │
    ┌─────────┼─────────┬──────────┐
    ▼         ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Supabase│ │Claude  │ │YouTube │ │Shopify │
│Postgres│ │  API   │ │  API   │ │  API   │
│Storage │ │        │ │        │ │        │
│Auth    │ │        │ │        │ │        │
└────────┘ └────────┘ └────────┘ └────────┘
```

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14+ (App Router, React Server Components) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS, Radix UI primitives |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Google OAuth, magic link) |
| **File Storage** | Supabase Storage (audio, video, images) |
| **AI** | Anthropic Claude API |
| **Publishing** | YouTube Data API v3, Shopify Admin API |
| **Hosting** | Vercel |

## Application Structure

The application is organized by feature within the Next.js App Router convention:

```
src/
├── app/
│   ├── (auth)/              # Login, signup, callback routes
│   ├── (dashboard)/         # Authenticated app shell
│   │   ├── content/         # Content list, detail, editor
│   │   ├── calendar/        # Content calendar view
│   │   ├── settings/        # Workspace settings, integrations
│   │   └── layout.tsx       # Dashboard shell (sidebar, nav)
│   ├── api/
│   │   ├── ai/              # Claude generation endpoints
│   │   ├── publish/         # YouTube + Shopify publish endpoints
│   │   └── webhooks/        # Supabase webhooks, OAuth callbacks
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # Base primitives (button, input, dialog)
│   └── features/            # Feature components (pipeline board, script editor)
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   ├── server.ts        # Server-side Supabase client
│   │   └── admin.ts         # Service-role client (for admin ops)
│   ├── claude.ts            # Claude API client wrapper
│   ├── youtube.ts           # YouTube API client
│   ├── shopify.ts           # Shopify API client
│   └── types.ts             # Shared TypeScript types
├── actions/                 # Next.js Server Actions
│   ├── content.ts           # Content CRUD, stage transitions
│   ├── ai.ts                # AI generation actions
│   ├── media.ts             # Upload, transcription triggers
│   └── publish.ts           # Publishing actions
└── env.ts                   # Environment variable validation
```

## Data Access Pattern

All database access goes through the Supabase client. There is no ORM -- queries use the Supabase JavaScript client which provides a typed query builder over PostgREST.

```
Browser → Server Component / Server Action → Supabase client → PostgreSQL
```

- **Server Components** fetch data directly during render using the server-side Supabase client.
- **Server Actions** handle mutations (create, update, delete, stage transitions).
- **Route Handlers** (`/api/...`) are used for streaming responses (AI generation) and webhook receivers.
- **Row Level Security (RLS)** is enabled on all tables. Policies enforce workspace isolation at the database level -- every query is automatically scoped to the authenticated user's workspace.

## Authentication Flow

1. User clicks "Sign in with Google" or enters email for magic link.
2. Supabase Auth handles the OAuth/magic link flow and redirects back with a session.
3. The Supabase client reads the session from cookies (via `@supabase/ssr`).
4. Server Components and Server Actions access `supabase.auth.getUser()` to identify the current user.
5. RLS policies on every table check the user's JWT against workspace membership.

No custom session management. No JWTs to issue or refresh manually. Supabase handles all of it.

## AI Generation

All AI generation runs in Next.js Route Handlers to support streaming:

1. Client calls `/api/ai/generate-script` (or `generate-blog`, `expand-idea`, `refine`).
2. Route handler validates the request, loads context (content object, workspace brand voice).
3. Calls Claude API with `stream: true`.
4. Pipes the streaming response back to the client using `ReadableStream`.
5. On completion, a Server Action saves the generated content to the database and logs token usage.

There is no queue. Generation runs synchronously in the request. Vercel's function timeout (60s on Pro plan) is sufficient for generation tasks.

## Media Upload and Transcription

1. Client requests a signed upload URL via Server Action.
2. Server Action calls `supabase.storage.createSignedUploadUrl()` and returns it.
3. Client uploads directly to Supabase Storage using the signed URL.
4. On upload completion, a Server Action creates the media record in the database.
5. Transcription is triggered by calling a Supabase Edge Function that processes the audio/video and writes the transcript back to the database.

Media files are stored in a private Supabase Storage bucket. Signed URLs with expiry are generated for playback.

## Publishing Flow

Publishing runs synchronously from Server Actions:

1. User selects targets (YouTube, Shopify, or both) and clicks Publish.
2. Server Action calls the appropriate API client(s) sequentially.
3. For **YouTube**: uploads video via resumable upload, sets metadata, thumbnail, and playlist.
4. For **Shopify**: creates or updates a blog article or product page via the Admin API.
5. Results (remote URL, remote ID, success/failure) are written to `publishing_records`.
6. Content object stage is updated to `distribute` on success.

If a publish fails, the error is recorded and the user can retry from the UI. There is no automatic retry.

## Security

- **RLS everywhere**: all tables have Row Level Security policies. The application never uses the service-role key for user-facing queries.
- **Workspace isolation**: RLS policies join through `workspace_members` to ensure users only see data in their workspaces.
- **Signed URLs**: media files are never publicly accessible. Access requires a time-limited signed URL.
- **API route protection**: all `/api/` route handlers verify the Supabase session before processing.
- **Environment secrets**: API keys (Claude, YouTube, Shopify) are stored in Vercel environment variables, never exposed to the client.
- **Input validation**: all Server Actions validate input with Zod schemas before database operations.

## Scalability Notes

This is an MVP architecture optimized for simplicity and speed of development. Known trade-offs:

- **No job queue**: publishing and transcription run synchronously. Acceptable for MVP volume. If publishing to multiple platforms becomes slow, this can be moved to Supabase Edge Functions or Vercel background functions.
- **No cache layer**: every read hits Postgres. Supabase connection pooling (Supavisor) handles connection management. For the MVP's expected load, this is fine.
- **Single region**: Vercel deploys to the region closest to the database (Supabase region). No multi-region replication.
- **Vercel function limits**: 60-second timeout on Pro plan. AI generation and video uploads must complete within this window. Large video uploads use resumable uploads client-side, so the server function only handles metadata.
