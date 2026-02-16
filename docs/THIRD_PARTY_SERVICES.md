# Third-Party Services

## Overview

Viral Cookie OS integrates with external services for AI generation, media processing, publishing, infrastructure, and operational tooling. This document catalogs every third-party dependency, its purpose, and integration details.

---

## AI and Machine Learning

### Anthropic Claude API

| Field | Value |
|---|---|
| **Purpose** | Script generation, blog writing, idea expansion, content refinement |
| **API** | `https://api.anthropic.com/v1/messages` |
| **Auth** | API key (`x-api-key` header) |
| **Model** | `claude-sonnet-4-5-20250929` (default), `claude-opus-4-6` (for complex generation tasks) |
| **Billing** | Per-token (input + output) |
| **Rate limits** | Tier-dependent; current allocation: 4,000 requests/min, 400K input tokens/min |
| **SDK** | `@anthropic-ai/sdk` (official TypeScript SDK) |

Integration notes:
- Streaming responses are used for all user-facing generation to provide real-time output.
- System prompts include workspace-specific brand voice and content guidelines when configured.
- All generation requests are logged to `ai_generation_logs` with token counts for billing reconciliation.
- Retry logic: 2 retries with 30-second delay on 429 (rate limit) and 529 (overloaded) responses.

---

## Transcription

### Deepgram

| Field | Value |
|---|---|
| **Purpose** | Speech-to-text transcription with speaker diarization |
| **API** | `https://api.deepgram.com/v1/listen` |
| **Auth** | API key (`Authorization: Token <key>`) |
| **Model** | `nova-2` (general), `nova-2-meeting` (multi-speaker) |
| **Billing** | Per-audio-minute processed |
| **Features used** | `punctuate`, `diarize`, `paragraphs`, `utterances`, `smart_format` |
| **SDK** | `@deepgram/sdk` (official TypeScript SDK) |

Integration notes:
- Audio/video files are sent via pre-signed R2 URLs (Deepgram fetches directly from storage).
- Transcription jobs run asynchronously via BullMQ; results are polled or received via callback URL.
- Speaker diarization is enabled for all multi-speaker content types (podcasts, interviews).
- Fallback: if Deepgram is unavailable, jobs are retried 3 times with exponential backoff before failing with user notification.

---

## Publishing Platforms

### YouTube Data API v3

| Field | Value |
|---|---|
| **Purpose** | Video upload, metadata management, playlist management |
| **API** | `https://www.googleapis.com/youtube/v3` |
| **Auth** | OAuth 2.0 (user grants channel access) |
| **Scopes** | `youtube.upload`, `youtube.force-ssl` |
| **Quota** | 10,000 units/day default (video upload = 1,600 units) |
| **SDK** | `googleapis` (official Google API client) |

Integration notes:
- OAuth tokens are stored encrypted in `publish_targets.credentials`.
- Token refresh is handled automatically; refresh failures trigger a re-auth prompt to the user.
- Video uploads use resumable upload protocol for reliability on large files.
- Quota consumption is tracked per workspace to warn users approaching daily limits.
- Thumbnail upload is a separate API call made immediately after successful video upload.

### Shopify Admin API

| Field | Value |
|---|---|
| **Purpose** | Create/update blog articles, product pages, and digital downloads |
| **API** | `https://{shop}.myshopify.com/admin/api/2024-10` |
| **Auth** | OAuth 2.0 (custom app installation) or private app access token |
| **Scopes** | `write_content`, `write_products`, `read_products` |
| **Rate limit** | 40 requests/second (REST), 1,000 cost points/second (GraphQL) |
| **SDK** | `@shopify/shopify-api` (official Node.js library) |

Integration notes:
- GraphQL Admin API is preferred for complex operations (product creation with variants and media).
- REST API is used for simple blog article creation.
- Webhook subscription for `app/uninstalled` to clean up publish targets when a store disconnects.
- Shopify rate limits are respected using the `X-Shopify-Shop-Api-Call-Limit` response header with automatic throttling.

### WordPress REST API

| Field | Value |
|---|---|
| **Purpose** | Publish blog posts to self-hosted WordPress sites |
| **API** | `https://{site}/wp-json/wp/v2` |
| **Auth** | Application password (Basic Auth) |
| **Endpoints** | `/posts`, `/media`, `/categories`, `/tags` |
| **Rate limit** | Varies by host |

Integration notes:
- Featured images are uploaded via `/media` endpoint before post creation.
- Categories and tags are created on first use and cached locally.
- Custom fields are supported via the `meta` property on posts (requires plugin on some WordPress setups).
- Connection test endpoint is called during target setup to validate credentials.

### Webflow CMS API

| Field | Value |
|---|---|
| **Purpose** | Publish content to Webflow CMS collections |
| **API** | `https://api.webflow.com/v2` |
| **Auth** | OAuth 2.0 (site authorization) |
| **Rate limit** | 60 requests/minute |
| **SDK** | `webflow-api` (official Node.js SDK) |

Integration notes:
- Users configure a field mapping between Viral Cookie OS content fields and Webflow collection fields during target setup.
- Rich text content is converted to Webflow's rich text format before publishing.
- Published items are set to "staged" by default; users can configure auto-publish in target settings.

---

## Infrastructure Services

### Neon (PostgreSQL)

| Field | Value |
|---|---|
| **Purpose** | Primary relational database |
| **Plan** | Scale |
| **Features used** | Serverless driver, connection pooling, branching, point-in-time restore |
| **SDK** | `@neondatabase/serverless` (HTTP driver), `postgres` (node-postgres for workers) |

### Upstash (Redis)

| Field | Value |
|---|---|
| **Purpose** | Job queue backend (BullMQ), caching, rate limiting |
| **Plan** | Pay-as-you-go |
| **Protocol** | Redis over TLS |
| **SDK** | `ioredis` (BullMQ requirement), `@upstash/redis` (REST-based for edge functions) |

### Cloudflare R2

| Field | Value |
|---|---|
| **Purpose** | Media file storage (audio, video, images, documents) |
| **API** | S3-compatible (`s3.{account_id}.r2.cloudflarestorage.com`) |
| **Auth** | Access key + secret key (S3 signature v4) |
| **Billing** | Storage + Class A/B operations (zero egress) |
| **SDK** | `@aws-sdk/client-s3` (S3-compatible) |

Integration notes:
- Presigned PUT URLs are generated server-side for direct client-to-R2 uploads.
- Presigned GET URLs with 1-hour expiry are used for authenticated media access.
- Public read access is disabled; all access is through signed URLs or the custom domain with Cloudflare access rules.
- Lifecycle rules: incomplete multipart uploads are cleaned up after 24 hours.

### Vercel

| Field | Value |
|---|---|
| **Purpose** | Next.js hosting, edge functions, cron jobs, preview deployments |
| **Plan** | Pro |
| **Features used** | Serverless functions, edge middleware, cron, preview deployments, log drain |

### Railway

| Field | Value |
|---|---|
| **Purpose** | Long-running background worker processes (BullMQ consumers) |
| **Plan** | Pro |
| **Features used** | Auto-deploy from GitHub, health checks, auto-restart, horizontal scaling |

### Cloudflare (DNS / CDN)

| Field | Value |
|---|---|
| **Purpose** | DNS, SSL, DDoS protection, static asset caching |
| **Plan** | Pro |
| **Features used** | Proxy mode, page rules, custom domain for R2 |

---

## Operational Tooling

### Sentry

| Field | Value |
|---|---|
| **Purpose** | Error tracking, performance monitoring, session replay |
| **Plan** | Team |
| **SDK** | `@sentry/nextjs` |
| **Features used** | Source maps, release tracking, alert rules, Slack integration |

### Axiom

| Field | Value |
|---|---|
| **Purpose** | Centralized structured logging |
| **Ingestion** | Vercel log drain + Railway log drain + direct `axiom-node` SDK |
| **Features used** | Querying, dashboards, alerting |

### Resend

| Field | Value |
|---|---|
| **Purpose** | Transactional email (magic link auth, notifications, publishing alerts) |
| **API** | `https://api.resend.com/emails` |
| **Auth** | API key (`Authorization: Bearer <key>`) |
| **SDK** | `resend` (official Node.js SDK) |
| **Sending domain** | `notifications@viralcookieos.com` (verified, DKIM + SPF configured) |

### GitHub

| Field | Value |
|---|---|
| **Purpose** | Source control, CI/CD via GitHub Actions, issue tracking |
| **Integrations** | Vercel GitHub app (auto-deploy), Railway GitHub app (auto-deploy), Sentry release integration |

---

## Service Dependency Matrix

This table shows which system components depend on each external service and the impact of service unavailability.

| Service | Depends On | Failure Impact | Mitigation |
|---|---|---|---|
| Claude API | AI Service | AI generation unavailable; all other features work | Queue jobs with retry; show "generation unavailable" in UI |
| Deepgram | Media Service | Transcription unavailable; upload and playback still work | Queue with retry; manual transcript entry as fallback |
| YouTube API | Publishing Service | YouTube publishing fails; other platforms unaffected | Retry with backoff; surface error to user |
| Shopify API | Publishing Service | Shopify publishing fails; other platforms unaffected | Retry with backoff; surface error to user |
| Neon | All services | Full application outage | Multi-region failover (Enterprise); Neon's 99.99% SLA |
| Upstash | Workers, caching | Background jobs stall; app remains functional for reads/writes | Upstash multi-region replication; degrade gracefully |
| Cloudflare R2 | Media Service | Media upload/playback unavailable; rest of app works | R2 SLA; uploads retry client-side |
| Resend | Auth, notifications | Magic link auth unavailable (OAuth still works); notifications delayed | Retry queue; OAuth as primary auth fallback |
