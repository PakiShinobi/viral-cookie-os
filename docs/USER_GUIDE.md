# User Guide

## Getting Started

### Creating Your Account

1. Navigate to `app.viralcookieos.com` and click **Get Started**.
2. Sign in with Google, GitHub, or enter your email for a magic link.
3. On first login you will be prompted to create a workspace. Enter a workspace name (e.g., your brand or studio name) and select your plan.

### Workspace Setup

After creating your workspace, configure foundational settings:

1. Open **Settings > General** from the sidebar.
2. Set your workspace **name**, **logo**, and **timezone**.
3. Under **Brand Voice**, describe your content style in plain language (e.g., "Conversational, informative, aimed at mid-career professionals. Avoid jargon. Use short paragraphs."). This description is used by AI generation to match your tone.
4. Under **Default Content Type**, choose the format you create most often (Video, Podcast, Blog Post, etc.). This sets the default when creating new content objects.

### Inviting Team Members

1. Open **Settings > Members**.
2. Click **Invite Member** and enter their email address.
3. Assign a role:
   - **Owner** -- full access including billing and workspace deletion.
   - **Editor** -- create, edit, and publish content.
   - **Reviewer** -- view content and approve/reject at review stages.
   - **Viewer** -- read-only access to all content.
4. The invitee receives an email with a link to join the workspace.

---

## Content Pipeline

### Understanding Stages

Every content object moves through a defined pipeline:

| Stage | Description |
|---|---|
| **Idea** | A topic, concept, or rough note. The starting point. |
| **Brief** | Structured outline: target audience, key points, format, and goals. |
| **Script** | Full written script or detailed plan for the content piece. |
| **Record** | Media is being recorded or has been uploaded. |
| **Edit** | Post-production: transcript review, media editing, refinements. |
| **Review** | Ready for team review and approval before publishing. |
| **Publish** | Approved and being pushed to publishing targets. |
| **Distribute** | Live on all configured platforms. |
| **Archived** | Completed and stored for reference. |

Content objects can move forward or backward through stages. Skipping stages is allowed (e.g., moving directly from Idea to Script if you do not need a formal brief).

### Creating Content

1. Click **+ New Content** in the top navigation or press `Ctrl+N` / `Cmd+N`.
2. Enter a **title** and select the **content type**.
3. Optionally set a **due date**, **assignee**, and **tags**.
4. The content object is created in the **Idea** stage.

### Moving Content Through Stages

- Open a content object and click the **stage badge** at the top of the detail view.
- Select the target stage from the dropdown.
- If the workspace has approval gates configured, moving to certain stages may require reviewer sign-off.

### Content Views

Switch between views using the tabs at the top of the content list:

- **List** -- sortable, filterable table of all content objects.
- **Board** -- Kanban board with columns for each pipeline stage. Drag and drop to change stages.
- **Calendar** -- Timeline view showing content by due date. Click a date to create content scheduled for that day.

### Filtering and Searching

- Use the **search bar** to find content by title, brief, or script text (full-text search).
- Apply **filters** for stage, content type, assignee, tags, and date range.
- Save frequently used filter combinations as **saved views** accessible from the sidebar.

---

## AI Generation

### Expanding an Idea

1. Open a content object in the **Idea** stage.
2. Click **AI: Expand Idea** in the action bar.
3. The AI reads your idea title and any notes, then generates a structured brief including:
   - Target audience
   - Key talking points
   - Suggested format and length
   - Hook and CTA recommendations
4. Review the output. Click **Accept** to save it as the content brief and advance to the Brief stage, or **Regenerate** for a new version.

### Generating a Script

1. Open a content object with a brief (in the **Brief** or later stage).
2. Click **AI: Generate Script**.
3. Configure generation options:
   - **Tone** -- select from presets (professional, casual, energetic, educational) or use your workspace brand voice.
   - **Length** -- short (3-5 min), medium (8-12 min), long (15-25 min), or custom word count.
   - **Format** -- video script (with visual cues), podcast script (with speaker labels), or written article.
4. Click **Generate**. The script streams in real-time on the right panel.
5. Review and:
   - **Accept** -- saves the script to the content object.
   - **Refine** -- type a follow-up instruction (e.g., "Make the intro shorter and more punchy") and the AI revises the script.
   - **Regenerate** -- produces a completely new version.

### Generating an SEO Blog Post

1. Open a content object that has a script or transcript.
2. Click **AI: Generate Blog**.
3. Configure:
   - **Target keywords** -- enter 1-5 keywords to optimize for.
   - **Length** -- target word count (1000, 1500, 2000, or custom).
   - **Include** -- toggle sections like FAQ, key takeaways, and embedded media references.
4. The AI generates a full blog post with:
   - SEO-optimized title and meta description.
   - Heading structure (H2/H3) built around target keywords.
   - Internal linking suggestions (references to other content in your workspace).
   - A readable, natural article derived from your source content.
5. The blog content is saved to the content object's `blog_content` field and can be published via the Publishing system.

### Generation History

Every AI generation is logged. Open the **AI History** tab on any content object to see previous generations, compare versions, and restore an earlier output.

---

## Media and Transcription

### Uploading Media

1. Open a content object and navigate to the **Media** tab.
2. Drag and drop files onto the upload area, or click **Browse** to select files.
3. Supported formats:
   - **Video**: MP4, MOV, WebM (up to 5 GB)
   - **Audio**: MP3, WAV, M4A, OGG (up to 1 GB)
   - **Images**: PNG, JPG, WebP (up to 50 MB)
   - **Documents**: PDF (up to 100 MB)
4. Upload progress is shown in real-time. Large files are uploaded in chunks for reliability.
5. Once uploaded, media is automatically linked to the content object.

### Automatic Transcription

When an audio or video file is uploaded, transcription begins automatically:

1. A spinning indicator appears on the media item showing transcription is in progress.
2. When complete, the **Transcript** tab becomes available on the content object.
3. The transcript displays with:
   - **Timestamps** -- click any segment to jump to that point in playback.
   - **Speaker labels** -- automatically detected speakers are labeled (Speaker 1, Speaker 2, etc.).
   - **Editable text** -- click any segment to correct transcription errors.
4. Rename speakers by clicking the speaker label and entering the actual name.

### Media Library

Access all workspace media from **Library** in the sidebar. Browse, search, filter by type, and re-link media to different content objects.

---

## Publishing

### Setting Up Publishing Targets

Before publishing, connect your platforms:

1. Open **Settings > Integrations**.
2. Click **Add Integration** and select a platform:

**YouTube:**
- Click **Connect YouTube** and authorize with your Google account.
- Select the YouTube channel to publish to.
- Optionally set a default playlist and default privacy setting (public, unlisted, private).

**Shopify:**
- Click **Connect Shopify** and enter your store URL.
- Install the Viral Cookie OS app on your Shopify store.
- Choose default content types: blog articles, product pages, or both.

**WordPress:**
- Enter your WordPress site URL.
- Generate an Application Password in your WordPress admin (Users > Your Profile > Application Passwords).
- Enter the username and application password.
- Select a default category and author.

**Webflow:**
- Click **Connect Webflow** and authorize your site.
- Select the CMS collection to publish to.
- Map content fields to Webflow collection fields.

### Publishing Content

1. Open a content object in the **Review** or **Publish** stage.
2. Click **Publish** in the action bar.
3. Select which targets to publish to (checkboxes for each configured integration).
4. For each target, review the publish preview:
   - **YouTube**: title, description, tags, thumbnail, playlist, schedule time.
   - **Shopify**: article title, body HTML, blog selection, SEO fields.
   - **WordPress**: post title, content, category, tags, featured image.
   - **Webflow**: mapped fields preview.
5. Click **Publish Now** or **Schedule** (set a future date/time).
6. Publishing jobs are queued and processed in the background.

### Monitoring Publish Status

The **Publishing** tab on each content object shows:

- Status per target: **Pending**, **In Progress**, **Published**, **Failed**.
- For published items: the live URL (clickable link to the published page/video).
- For failed items: the error message and a **Retry** button.

### Updating Published Content

If you edit content after publishing:

1. Open the content object and make changes.
2. Click **Republish** to push updates to all previously published targets.
3. The system updates existing remote content (same YouTube video, same Shopify article) rather than creating duplicates.

---

## Collaboration

### Comments

- Open any content object and scroll to the **Comments** section.
- Type a comment and press **Enter** to post.
- **@mention** team members to notify them.
- Reply to existing comments to create threads.

### Assignments

- Set the **Assigned to** field on a content object to delegate work.
- The assignee receives a notification and sees the item highlighted in their personal task list.

### Activity Feed

The **Activity** page in the sidebar shows a chronological feed of all workspace actions: content created, stages changed, media uploaded, content published, and comments posted.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + N` | Create new content |
| `Ctrl/Cmd + K` | Open command palette (search and navigate) |
| `Ctrl/Cmd + /` | Toggle keyboard shortcut reference |
| `Ctrl/Cmd + S` | Save current content |
| `Ctrl/Cmd + Enter` | Submit current form / trigger primary action |
| `Ctrl/Cmd + Shift + P` | Open publish dialog |
| `G then L` | Navigate to content list |
| `G then B` | Navigate to board view |
| `G then C` | Navigate to calendar view |
| `G then S` | Navigate to settings |

---

## Account and Billing

### Managing Your Plan

1. Open **Settings > Billing**.
2. View current plan, usage (content objects, media storage, AI tokens), and billing period.
3. Click **Upgrade** to move to a higher tier, or **Manage Subscription** to update payment method.

### Exporting Your Data

1. Open **Settings > General**.
2. Click **Export Workspace Data**.
3. Select what to export: content objects (JSON), media files (ZIP), transcripts (SRT/TXT), publishing records (CSV).
4. A download link is emailed when the export is ready.

### Deleting Your Account

1. Open **Settings > Account**.
2. Click **Delete Account**.
3. Confirm by typing your email address.
4. All data is permanently deleted within 30 days per the data retention policy.
