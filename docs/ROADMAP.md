# Roadmap

## Release Strategy

Development follows a phased approach. Each phase delivers a usable increment of the product. Phases are sequential, but internal milestones within a phase may overlap.

---

## Phase 1 -- Foundation (Weeks 1-6)

Goal: Core data model, authentication, and basic content pipeline with manual operations.

### Milestone 1.1: Project Scaffolding (Week 1-2)

- [x] Initialize monorepo with Next.js, TypeScript, Tailwind, tRPC.
- [ ] Configure Drizzle ORM with Neon PostgreSQL.
- [ ] Set up NextAuth.js with Google OAuth and magic link providers.
- [ ] Implement workspace creation and membership management.
- [ ] Configure CI pipeline (lint, type-check, test) on GitHub Actions.
- [ ] Set up Vercel preview deployments on pull requests.

### Milestone 1.2: Content Object Model (Week 2-3)

- [ ] Implement core database schema (workspaces, users, content objects, media, relationships).
- [ ] Build tRPC routers for content CRUD and listing with pagination.
- [ ] Implement content pipeline state machine with stage transition validation.
- [ ] Add full-text search across content objects using PostgreSQL `tsvector`.
- [ ] Seed database with sample content for development.

### Milestone 1.3: Dashboard UI (Week 3-5)

- [ ] Build workspace switcher and navigation shell.
- [ ] Implement content list view with filtering and sorting.
- [ ] Build content detail page with metadata editor.
- [ ] Implement Kanban board view grouped by pipeline stage.
- [ ] Build content calendar (timeline) view.
- [ ] Add role-based UI gating (hide actions user cannot perform).

### Milestone 1.4: Media Upload (Week 5-6)

- [ ] Implement presigned URL generation for R2 direct upload.
- [ ] Build drag-and-drop upload UI with progress indicator.
- [ ] Store media metadata (size, type, duration) on upload completion.
- [ ] Link media attachments to content objects.
- [ ] Display media preview (audio player, video player, image thumbnail) in content detail.

**Phase 1 deliverable**: Users can sign in, create workspaces, manage content objects through pipeline stages, and attach media files.

---

## Phase 2 -- AI Generation (Weeks 7-10)

Goal: Claude-powered content generation integrated into the pipeline.

### Milestone 2.1: AI Service Backend (Week 7-8)

- [ ] Build AI service with Claude API integration (streaming).
- [ ] Implement prompt template system with versioning.
- [ ] Create generation endpoints: `expandIdea`, `generateScript`, `generateBlog`.
- [ ] Add `refine` endpoint for iterative editing with conversation context.
- [ ] Implement token budget tracking and rate limiting per workspace.
- [ ] Set up BullMQ queue for async generation jobs.

### Milestone 2.2: AI Generation UI (Week 8-9)

- [ ] Build AI generation panel in content detail view.
- [ ] Implement streaming response display with real-time token rendering.
- [ ] Add tone, length, and format controls for script generation.
- [ ] Build side-by-side view: AI draft vs. current script.
- [ ] Implement "accept", "regenerate", and "refine" actions on AI output.
- [ ] Add generation history per content object.

### Milestone 2.3: SEO Blog Generation (Week 9-10)

- [ ] Build blog generation pipeline: transcript/script → outline → draft → optimized article.
- [ ] Add keyword targeting input and SEO scoring.
- [ ] Generate meta title, meta description, and heading structure.
- [ ] Support internal link suggestions based on existing content in the workspace.
- [ ] Preview generated blog with formatting before publishing.

**Phase 2 deliverable**: Users can generate scripts from ideas, refine them conversationally, and produce SEO blog posts from any content object.

---

## Phase 3 -- Transcription and Media Processing (Weeks 11-13)

Goal: Automatic transcription of uploaded audio/video and media derivative generation.

### Milestone 3.1: Transcription Pipeline (Week 11-12)

- [ ] Integrate Deepgram API for speech-to-text.
- [ ] Build transcription worker consuming from BullMQ queue.
- [ ] Store transcript segments with timestamps and speaker labels.
- [ ] Build transcript viewer UI with playback sync (click segment → seek to timestamp).
- [ ] Implement transcript editing (correct errors, reassign speakers).
- [ ] Auto-advance content object to next pipeline stage on transcription completion.

### Milestone 3.2: Media Derivatives (Week 12-13)

- [ ] Generate video thumbnails (frame extraction at configurable timestamp).
- [ ] Generate audio waveform visualizations for podcast content.
- [ ] Extract and store media duration, resolution, codec metadata.
- [ ] Build media library view at workspace level.

**Phase 3 deliverable**: Uploaded recordings are automatically transcribed, searchable, and linked to their content objects.

---

## Phase 4 -- Publishing (Weeks 14-18)

Goal: Automated multi-platform publishing from the dashboard.

### Milestone 4.1: Publishing Framework (Week 14-15)

- [ ] Define `PublishTarget` interface and adapter pattern.
- [ ] Build publishing job queue with retry logic and status tracking.
- [ ] Implement publishing record storage on content objects.
- [ ] Build publishing status UI (pending, in progress, success, failed, with error details).
- [ ] Add dry-run mode for previewing publish payload.

### Milestone 4.2: YouTube Adapter (Week 15-16)

- [ ] Implement YouTube Data API v3 integration (OAuth2 for channel access).
- [ ] Support video upload with title, description, tags, category, thumbnail.
- [ ] Support playlist management (add to existing or create new).
- [ ] Support scheduled publishing (set publish time in the future).
- [ ] Handle YouTube quota limits with backoff and user notification.

### Milestone 4.3: Shopify Adapter (Week 16-17)

- [ ] Implement Shopify Admin API integration (OAuth2 for store access).
- [ ] Support blog article creation with embedded video and content.
- [ ] Support product page creation for digital content (courses, downloads).
- [ ] Map content object metadata to Shopify fields (SEO, tags, collections).

### Milestone 4.4: CMS / Blog Adapter (Week 17-18)

- [ ] Implement WordPress REST API adapter.
- [ ] Implement Webflow CMS API adapter.
- [ ] Implement generic webhook adapter for headless CMS targets.
- [ ] Support custom field mapping configuration per target.

**Phase 4 deliverable**: Users can publish content to YouTube, Shopify, and blog platforms directly from the dashboard with automatic retry and status tracking.

---

## Phase 5 -- Team and Workflow (Weeks 19-22)

Goal: Collaboration features, review workflows, and workspace administration.

### Milestone 5.1: Collaboration (Week 19-20)

- [ ] Implement commenting on content objects (threaded, with @mentions).
- [ ] Build activity feed showing recent actions across the workspace.
- [ ] Add notification system (in-app + email) for assignments, comments, and stage transitions.
- [ ] Implement content locking (prevent concurrent edits).

### Milestone 5.2: Review Workflows (Week 20-21)

- [ ] Add configurable approval gates at pipeline stages (e.g., require reviewer sign-off before publish).
- [ ] Build review UI: approve, request changes, add notes.
- [ ] Support multi-reviewer workflows with quorum settings.

### Milestone 5.3: Workspace Admin (Week 21-22)

- [ ] Build workspace settings page (general, members, billing, integrations).
- [ ] Implement SSO via SAML 2.0 for Business/Enterprise tiers.
- [ ] Add API key management with scoped permissions.
- [ ] Build audit log for workspace-level actions.

**Phase 5 deliverable**: Teams can collaborate with comments, approval workflows, and full workspace administration.

---

## Phase 6 -- Analytics and Optimization (Weeks 23-26)

Goal: Pipeline analytics, AI performance metrics, and publishing insights.

- [ ] Pipeline throughput dashboard: content objects by stage, average time per stage, bottleneck identification.
- [ ] AI generation metrics: tokens used, acceptance rate, most-used templates.
- [ ] Publishing analytics: success/failure rates by platform, republish frequency.
- [ ] Content calendar utilization: planned vs. published, scheduling gaps.
- [ ] Export reports as CSV for external analysis.

---

## Future (v2+)

| Feature | Description |
|---|---|
| **Real-time collaborative editing** | Multiplayer script editing with presence indicators and conflict resolution |
| **Native mobile app** | iOS/Android app for content review, approvals, and quick idea capture |
| **Social media scheduling** | Direct posting to X/Twitter, Instagram, LinkedIn, TikTok |
| **Advanced AI features** | Brand voice training, content performance prediction, auto-suggested topics |
| **Marketplace** | Community prompt templates and publishing adapter plugins |
| **Self-hosted option** | Docker-based deployment for Enterprise customers with data residency requirements |
| **Content performance tracking** | Pull view counts, engagement metrics from published platforms back into the dashboard |
| **Webhook / Zapier integration** | Event-driven automation for external workflow tools |
