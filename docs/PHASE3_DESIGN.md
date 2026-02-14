# Phase 3: YouTube → Shopify Autopublish Engine

## Overview

Automated pipeline: detect new YouTube uploads → extract transcript → generate SEO blog post via Claude → publish to Shopify blog. Runs entirely within the Next.js monolith using a single Vercel cron-triggered API route. No Redis, no workers, no queues.

---

## Integration Flow

```
[Vercel Cron: every 15 min]
        │
        ▼
GET /api/cron/youtube
        │
        ├─ Step 1: Poll
        │   YouTube Data API → list new uploads for YOUTUBE_CHANNEL_ID
        │   Skip if video_id already in youtube_videos
        │   Create content record (stage: "record")
        │   Insert youtube_videos row
        │
        ├─ Step 2: Transcribe
        │   Find youtube_videos where transcript is null
        │   Fetch captions via YouTube timedtext API
        │   Save transcript to youtube_videos.transcript
        │
        ├─ Step 3: Generate
        │   Find youtube_videos with transcript + content.stage = "record"
        │   Claude API → generate SEO blog post
        │   Save blog_body, seo_title, seo_description to content
        │   Log to ai_generation_logs
        │   Update stage → "review"
        │
        ├─ Step 4: Publish
        │   Find content where stage = "review" and auto_publish = true
        │   Shopify Admin API → create blog article
        │   Insert publishing_records row
        │   Update stage → "publish"
        │
        ▼
      [Done — returns JSON summary]
```

---

## New Database Tables

### `youtube_videos`

Stores video metadata, transcript, and link to content record.

```sql
create table youtube_videos (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references content on delete set null,
  video_id text not null unique,
  video_title text not null,
  video_description text,
  published_at timestamptz,
  thumbnail_url text,
  transcript text,
  created_at timestamptz default now()
);

alter table youtube_videos enable row level security;

create policy "Users view own videos"
  on youtube_videos for select
  using (
    exists (
      select 1 from content
      where content.id = youtube_videos.content_id
      and content.user_id = auth.uid()
    )
  );

create index idx_youtube_videos_video_id on youtube_videos (video_id);
create index idx_youtube_videos_content_id on youtube_videos (content_id);
```

### `publishing_records`

Tracks what was published where.

```sql
create table publishing_records (
  id uuid primary key default gen_random_uuid(),
  content_id uuid references content on delete cascade not null,
  platform text not null default 'shopify_blog',
  external_id text,
  external_url text,
  status text not null default 'published',
  created_at timestamptz default now()
);

alter table publishing_records enable row level security;

create policy "Users view own publishing records"
  on publishing_records for select
  using (
    exists (
      select 1 from content
      where content.id = publishing_records.content_id
      and content.user_id = auth.uid()
    )
  );

create index idx_publishing_records_content_id on publishing_records (content_id);
```

### Content table additions

```sql
alter table content add column auto_publish boolean default false;
alter table content add column source text default 'manual';
```

---

## New Environment Variables

```env
# YouTube
YOUTUBE_API_KEY=                    # YouTube Data API v3 key
YOUTUBE_CHANNEL_ID=                 # Single channel to poll (e.g. UCxxxxxx)
CRON_SECRET=                        # Protects cron endpoint

# Shopify
SHOPIFY_STORE_DOMAIN=               # e.g. mystore.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=         # Admin API access token
SHOPIFY_BLOG_ID=                    # Target blog ID
```

---

## API Route

### `GET /api/cron/youtube`

Single route, four sequential steps. Protected by `CRON_SECRET` header check. All steps are idempotent — safe to re-run on any failure.

**Auth check:**
```
Authorization: Bearer {CRON_SECRET}
```
Return 401 if missing or invalid. Return 503 if required env vars (`YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`) are not set.

**Step 1 — Poll new uploads:**
- Derive uploads playlist ID from `YOUTUBE_CHANNEL_ID` (replace `UC` prefix with `UU`)
- Call `playlistItems.list` (1 quota unit vs 100 for search):
  ```
  GET https://www.googleapis.com/youtube/v3/playlistItems
    ?part=snippet
    &playlistId={uploadsPlaylistId}
    &maxResults=5
    &key={YOUTUBE_API_KEY}
  ```
- For each video: attempt insert into `youtube_videos` — unique constraint on `video_id` prevents duplicates
- For each new insert: create `content` row with `title=video_title`, `content_type='blog_post'`, `stage='record'`, `source='youtube'`, `user_id` from first user (single-tenant MVP)

**Step 2 — Fetch transcripts:**
- Query `youtube_videos` where `transcript is null` (limit 3 per run to stay within cron timeout)
- Fetch captions via YouTube timedtext endpoint:
  ```
  GET https://www.youtube.com/api/timedtext
    ?v={videoId}&lang=en&fmt=srv3
  ```
- Strip XML tags, normalize whitespace, save cleaned text to `youtube_videos.transcript`
- If no captions available, set `transcript = ''` (empty string) to mark as attempted and skip in future runs

**Step 3 — Generate blog post:**
- Query: `youtube_videos` where `transcript != ''` and `transcript is not null`, joined to `content` where `stage = 'record'` (limit 1 per run — Claude calls are slow)
- Call Claude (non-streaming):
  ```
  model: claude-sonnet-4-5-20250929
  max_tokens: 4096
  ```
- Save to content: `blog_body`, `seo_title`, `seo_description`, `target_keywords`
- Log to `ai_generation_logs`: `operation='generate_blog'`, `input_tokens`, `output_tokens`
- Update `content.stage` → `'review'`

**Step 4 — Publish to Shopify:**
- Query `content` where `stage = 'review'` and `auto_publish = true`
- Check `publishing_records` for existing `content_id` + `platform='shopify_blog'` — skip if already published
- Call Shopify Admin API:
  ```
  POST https://{SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/blogs/{SHOPIFY_BLOG_ID}/articles.json
  X-Shopify-Access-Token: {SHOPIFY_ADMIN_ACCESS_TOKEN}

  { "article": { "title": seo_title, "body_html": blog_body, "published": true } }
  ```
- Insert `publishing_records` with `external_id` (article ID) and `external_url`
- Update `content.stage` → `'publish'`

**Response:** Return JSON summary of what happened in each step:
```json
{
  "polled": 2,
  "transcribed": 1,
  "generated": 1,
  "published": 0
}
```

---

## YouTube Data API Details

**Authentication:** API key only (public data, no OAuth).

**Quota cost:** `playlistItems.list` = 1 unit. At 4 calls/hour = 96 units/day. Well within the 10,000 daily quota.

**Captions:** The timedtext endpoint does not require OAuth and works for videos with auto-generated or manual captions. If the endpoint returns empty/error, mark transcript as empty string to prevent retry loops.

---

## Shopify Admin API Details

**Setup:**
1. Shopify Admin → Settings → Apps → Develop apps
2. Create app, grant `write_content` scope
3. Install app, copy Admin API access token
4. Find blog ID: `GET /admin/api/2024-01/blogs.json`

**Response shape:** `{ article: { id, handle } }` — construct URL as `https://{store}/blogs/{blog_handle}/{article_handle}`.

---

## Idempotency & Duplicate Prevention

| Concern | Mechanism |
|---|---|
| Duplicate video ingestion | `video_id` unique constraint — insert silently skipped |
| Duplicate transcript fetch | `transcript is null` query — once set (even to empty), never re-fetched |
| Duplicate blog generation | `stage = 'record'` query — once moved to `'review'`, never re-generated |
| Duplicate Shopify publish | Check `publishing_records` for existing `content_id + platform` before API call |
| Cron overlap | Each step processes limited items (5/3/1/all) — fast execution prevents overlap |

---

## Vercel Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/youtube",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Vercel sends `Authorization: Bearer {CRON_SECRET}` automatically for cron invocations.

---

## Type Additions

```typescript
// Add to src/lib/types.ts

export interface YouTubeVideo {
  id: string;
  content_id: string | null;
  video_id: string;
  video_title: string;
  video_description: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  transcript: string | null;
  created_at: string;
}

export interface PublishingRecord {
  id: string;
  content_id: string;
  platform: string;
  external_id: string | null;
  external_url: string | null;
  status: "published" | "failed" | "draft";
  created_at: string;
}
```

Update `Content` interface to include:
```typescript
auto_publish: boolean;
source: string | null;
```

---

## Known Risks & Fallback Plans

### Transcript Ingestion (InnerTube)

The current implementation uses YouTube's InnerTube Android client (`youtubei/v1/player`) to obtain caption URLs. This is a best-effort, undocumented approach.

**Why:** The official `captions.download` endpoint requires OAuth, and the `timedtext` endpoint rejects server-side requests (empty response due to IP-bound signatures). The Android InnerTube client returns caption URLs that work server-side without OAuth.

**Risk:** YouTube may change or restrict this endpoint without notice.

**Fallback plan (in priority order):**
1. Add OAuth flow for official YouTube Captions API (`captions.download`)
2. Support manual transcript upload via the UI
3. Integrate Whisper for audio-to-text (requires audio download)

**Mitigation:** If `fetchTranscript` fails, transcript is set to empty string (`""`) which prevents retry loops. Content stays at `stage='record'` and can be manually progressed.

---

## Build Order

1. **Migration:** Create `youtube_videos` and `publishing_records` tables. Alter `content` with `auto_publish` and `source` columns.
2. **Types:** Add `YouTubeVideo`, `PublishingRecord` interfaces. Update `Content`.
3. **Env:** Add `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`, `CRON_SECRET`, Shopify variables to `.env.local` and `env.ts`.
4. **Cron route:** Build `/api/cron/youtube` with all four steps.
5. **Vercel config:** Add `vercel.json` with cron schedule.
6. **UI:** Show publishing status on content detail page.
7. **Test:** End-to-end with real YouTube channel and Shopify store.
