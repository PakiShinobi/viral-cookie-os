# Product Scope

## Overview

Viral Cookie OS is a content operating system for creators, studios, and media businesses. It manages the full content lifecycle -- from ideation to multi-platform distribution -- through a unified pipeline backed by AI generation, automated transcription, and cross-platform publishing.

The platform treats every content artifact as a first-class object in a shared data model, enabling teams to move from a raw idea to a published YouTube video, Shopify product listing, and SEO-optimized blog post through a single coordinated workflow.

## Problem Statement

Content teams today operate across disconnected tools: Google Docs for scripts, Notion for calendars, Descript for editing, manual uploads to YouTube, copy-paste into Shopify, and separate CMS logins for blog posts. This fragmentation causes:

1. **Pipeline leakage** -- ideas die in spreadsheets because there is no structured path from concept to published asset.
2. **Manual republishing** -- a single podcast episode requires 4-6 manual touch points to become a YouTube video, blog post, and product page.
3. **No single source of truth** -- metadata, scripts, transcripts, and publishing status live in different systems with no relational integrity.
4. **Underutilized content** -- most recordings are published once on one platform. The effort-to-output ratio is poor because repurposing is manual.

## Target Users

| Persona | Description | Primary Need |
|---|---|---|
| **Solo Creator** | Independent YouTuber, podcaster, or course creator producing 2-10 pieces/month | Reduce production overhead; turn one recording into multiple assets |
| **Content Studio** | Small team (3-15 people) producing content for clients or owned brands | Pipeline visibility, assignment tracking, batch publishing |
| **Media Business** | Established brand with podcast network, YouTube channels, and e-commerce | Unified content model across all properties, API-driven automation |
| **Marketing Team** | In-house content marketers at SaaS or DTC companies | SEO blog generation from existing video/audio content at scale |

## Core Capabilities

### 1. Content Pipeline Engine

A state machine that tracks every content object through defined lifecycle stages:

```
idea → brief → script → record → edit → review → publish → distribute
```

- Each stage has configurable entry/exit criteria.
- Assignments, due dates, and blockers are tracked per stage.
- Batch operations allow moving multiple items through the pipeline simultaneously.
- Automation rules trigger stage transitions based on events (e.g., auto-advance to "review" when a transcript is attached).

### 2. AI Script Generation

Claude-powered generation integrated directly into the pipeline:

- **Idea expansion** -- turn a one-line topic into a structured content brief with target audience, key points, and suggested format.
- **Script drafting** -- generate full scripts (video, podcast, short-form) from a brief, with tone, length, and structure controls.
- **Iterative refinement** -- conversational editing within the script editor ("make the intro more conversational", "add a CTA after section 2").
- **SEO blog generation** -- transform a transcript or script into a long-form blog post optimized for target keywords, with heading structure, meta description, and internal linking suggestions.
- **Batch generation** -- produce multiple variants (e.g., YouTube script + Twitter thread + newsletter excerpt) from a single source.

### 3. Media Ingest and Transcription

- Upload audio/video files or provide URLs for import.
- Automatic transcription with speaker diarization and timestamp alignment.
- Transcript editing interface with playback sync.
- Metadata extraction: duration, format, resolution, detected language.
- Generates a searchable transcript linked to the parent content object.

### 4. Publishing Orchestrator

Automated multi-platform distribution triggered from the dashboard or API:

- **YouTube** -- upload video, set title/description/tags/thumbnail, schedule publish time, manage playlists.
- **Shopify** -- create or update product pages, digital downloads, or blog posts tied to content objects.
- **Blog/CMS** -- publish SEO articles to WordPress, Webflow, or headless CMS via API.
- **Social** -- generate and queue short-form clips and captions for downstream social scheduling tools.
- Publishing is idempotent -- re-publishing updates the existing remote asset rather than creating duplicates.
- Status tracking: every publish action records the remote URL, timestamp, and success/failure state.

### 5. Unified Content Object Model

Every artifact in the system is a typed object with:

- Canonical ID, creation timestamp, and ownership.
- Lifecycle stage and stage history.
- Relationships (e.g., a blog post `derived_from` a podcast episode; a script `belongs_to` a content brief).
- Arbitrary metadata (tags, categories, campaigns, custom fields).
- Media attachments (audio, video, images, documents).
- Publishing records (platform, remote ID, URL, status).

### 6. Workspace and Collaboration

- Content calendar with Kanban and timeline views.
- Role-based access: Owner, Editor, Reviewer, Viewer.
- Commenting and approval workflows on scripts and briefs.
- Activity feed showing pipeline movement across the team.
- Workspace-level settings for default publishing targets, AI generation preferences, and brand voice.

## Out of Scope (v1)

- Built-in video/audio editor (users edit externally and upload finished files).
- Native social media scheduling (we output assets; users connect their existing scheduler).
- Real-time collaborative script editing (single-editor with locking in v1; multiplayer planned for v2).
- Mobile application (responsive web only in v1).
- White-label / reseller program.

## Success Metrics

| Metric | Target |
|---|---|
| Time from idea to first publish | < 2 hours (vs. industry avg 8-12 hours) |
| Content objects repurposed per source recording | 3+ platforms from 1 recording |
| AI script acceptance rate (publish without major manual rewrite) | > 60% |
| Publishing success rate (no failed pushes) | > 99.5% |
| Dashboard page load (P95) | < 1.5 s |
| API response time (P99) | < 300 ms |
| Monthly uptime | 99.95% |

## Pricing Model

| Tier | Content Objects / month | Features |
|---|---|---|
| **Creator** | Up to 50 | 1 workspace, 3 publishing targets, AI generation (50K tokens/mo), 10 GB media storage |
| **Studio** | Up to 250 | 5 workspaces, unlimited publishing targets, AI generation (500K tokens/mo), 100 GB media storage, team roles |
| **Business** | Up to 1,000 | Unlimited workspaces, API access, custom integrations, AI generation (2M tokens/mo), 500 GB media storage, SSO, priority support |
| **Enterprise** | Unlimited | Custom contract, dedicated infrastructure, SLA, onboarding, custom AI model tuning |
