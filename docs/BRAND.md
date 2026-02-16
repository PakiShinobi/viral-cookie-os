# Brand Guidelines

## Brand Identity

### Name

**Viral Cookie OS**

- Full name used in marketing, documentation, and legal contexts.
- **VCOS** is the accepted abbreviation for internal use, CLI tooling, and developer contexts.
- Never abbreviate as "VCO", "ViralCookie", or "Cookie OS".
- The "OS" stands for Operating System and is always capitalized.

### Tagline

**Your content engine.**

Used beneath the logo in marketing materials, landing pages, and email signatures. The tagline communicates that Viral Cookie OS is infrastructure, not just another tool.

### Mission Statement

Viral Cookie OS exists to eliminate the operational overhead of content production so creators and teams can focus on what they do best: creating. We build the system that moves ideas to every platform, automatically.

### Brand Personality

| Trait | Expression |
|---|---|
| **Direct** | We say what we mean in the fewest words. No filler, no fluff. |
| **Builder-first** | We speak to people who make things. Our language reflects craft, systems, and process. |
| **Confident** | We believe in the product. We state capabilities clearly without hedging. |
| **Approachable** | Technical but not intimidating. We explain complex systems in plain language. |
| **Energetic** | Content creation is momentum. Our voice carries pace and forward motion. |

---

## Logo

### Primary Logo

The primary logo is the wordmark "Viral Cookie OS" in the brand typeface. It is used on the marketing site, documentation headers, and external communications.

- Minimum clear space: the height of the "V" on all sides.
- Minimum size: 120px wide for digital, 30mm for print.
- Always use the logo files from the brand assets package. Never recreate the logo in a different typeface.

### Icon

The icon is a stylized interlocking "VC" monogram used as:

- Favicon (16x16, 32x32, 180x180).
- App icon for PWA and mobile.
- Social media profile image.
- Small-format contexts where the full wordmark does not fit.

### Logo Variants

| Variant | Use |
|---|---|
| **Dark on light** | Default. Used on white or light backgrounds. |
| **Light on dark** | Used on dark backgrounds, dark mode UI, and video overlays. |
| **Monochrome** | Used when color reproduction is limited (fax, single-color print, embossing). |

### Logo Misuse

Do not:

- Rotate, skew, or distort the logo.
- Change the logo colors outside the defined variants.
- Place the logo on busy backgrounds without sufficient contrast.
- Add effects (drop shadows, gradients, outlines) to the logo.
- Place text or other elements inside the clear space.

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Ink** | `#0F172A` | 15, 23, 42 | Primary text, dark backgrounds |
| **Coral** | `#F43F5E` | 244, 63, 94 | Primary accent, CTAs, active states |
| **White** | `#FFFFFF` | 255, 255, 255 | Backgrounds, inverted text |

### Secondary Colors

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Slate 50** | `#F8FAFC` | 248, 250, 252 | Page background (light mode) |
| **Slate 200** | `#E2E8F0` | 226, 232, 240 | Borders, dividers |
| **Slate 500** | `#64748B` | 100, 116, 139 | Secondary text, captions |
| **Slate 800** | `#1E293B` | 30, 41, 59 | Dark mode backgrounds |

### Functional Colors

| Name | Hex | Usage |
|---|---|---|
| **Success** | `#10B981` | Published status, success messages |
| **Warning** | `#F59E0B` | Pending states, quota warnings |
| **Error** | `#EF4444` | Failed actions, validation errors |
| **Info** | `#3B82F6` | Informational callouts, links |

### Gradients

The brand gradient is used sparingly for hero sections and featured elements:

```css
background: linear-gradient(135deg, #F43F5E 0%, #EC4899 50%, #8B5CF6 100%);
```

This gradient is never applied to text, buttons, or small UI elements.

---

## Typography

### Typefaces

| Use | Typeface | Weight | Fallback Stack |
|---|---|---|---|
| **Headings** | Inter | 700 (Bold) | `system-ui, -apple-system, sans-serif` |
| **Body** | Inter | 400 (Regular), 500 (Medium) | `system-ui, -apple-system, sans-serif` |
| **Code / Mono** | JetBrains Mono | 400, 500 | `ui-monospace, 'Cascadia Code', monospace` |

Inter is loaded from Google Fonts via `next/font` with `display: swap` for performance.

### Type Scale

Based on a 1.25 ratio, anchored to 16px base:

| Level | Size | Line Height | Weight | Use |
|---|---|---|---|---|
| **Display** | 48px / 3rem | 1.1 | 700 | Landing page hero |
| **H1** | 36px / 2.25rem | 1.2 | 700 | Page titles |
| **H2** | 28px / 1.75rem | 1.3 | 700 | Section headings |
| **H3** | 22px / 1.375rem | 1.4 | 600 | Subsection headings |
| **H4** | 18px / 1.125rem | 1.4 | 600 | Card titles |
| **Body** | 16px / 1rem | 1.6 | 400 | Default text |
| **Small** | 14px / 0.875rem | 1.5 | 400 | Captions, metadata |
| **XS** | 12px / 0.75rem | 1.4 | 500 | Badges, labels |

---

## Voice and Tone

### Writing Principles

1. **Lead with the action.** Start sentences with verbs. "Upload your recording" not "You can upload your recording by clicking..."
2. **Be specific.** "Publishes to YouTube in under 30 seconds" not "Fast publishing to various platforms."
3. **Skip the preamble.** Get to the point in the first sentence. No "Welcome to our guide about..."
4. **Use plain language.** "Connect your YouTube channel" not "Integrate with the YouTube Data API v3 ecosystem."
5. **Respect the reader's time.** Shorter is better. If a sentence has more than 25 words, break it up.

### Tone by Context

| Context | Tone | Example |
|---|---|---|
| **Marketing / Landing** | Bold, energetic, benefits-focused | "Turn one recording into five published assets. Automatically." |
| **Product UI** | Clear, concise, actionable | "Select publishing targets" / "Script generated successfully" |
| **Documentation** | Precise, neutral, structured | "The `stage` field accepts the following values: idea, brief, script..." |
| **Error messages** | Helpful, specific, non-blaming | "YouTube upload failed: video file exceeds 128 GB limit. Try compressing the file." |
| **Email / Notifications** | Friendly, informative, brief | "Your podcast episode is live on YouTube. View it here." |

### Words We Use

| Preferred | Avoid |
|---|---|
| content object | asset, item, thing |
| workspace | organization, team, account |
| publish | push, deploy, ship (in user-facing text) |
| generate | create (when referring to AI output) |
| stage | status, step, phase (for pipeline stages) |
| target | destination, endpoint (for publishing platforms) |

### Words We Avoid

- "Simply", "just", "easily" -- these minimize the user's effort and frustrate people when things go wrong.
- "Please" in action labels -- buttons and links are imperative ("Save", not "Please save").
- "Click here" -- use descriptive link text instead.
- Jargon without context -- if a technical term is necessary, explain it on first use.

---

## Imagery and Illustration

### Photography

Not used in the product UI. Marketing materials may use:

- High-contrast images of creators at work (recording, editing, presenting).
- Abstract textures and patterns for backgrounds.
- No stock photos of people pointing at screens or shaking hands.

### Illustrations

- Line-style illustrations using the brand color palette.
- Used for empty states, onboarding, and feature explanations.
- Consistent stroke width (2px) and rounded corners.
- Illustrations convey process and motion (arrows, connecting lines, flow diagrams).

### Iconography

- Lucide icon set (open source, consistent with Inter typeface aesthetics).
- 24px default size, 1.5px stroke.
- Use `Slate 500` for inactive icons, `Ink` for active, `Coral` for primary actions.

---

## Social Media

### Handles

- Twitter/X: `@viralcookieos`
- YouTube: `@viralcookieos`
- LinkedIn: `Viral Cookie OS`
- GitHub: `PakiShinobi/viral-cookie-os`

### Social Posting Guidelines

- Product announcements use the brand gradient as the background with white text.
- Feature screenshots use a browser frame mockup on a `Slate 50` background with a subtle drop shadow.
- Video content uses the brand intro/outro template (3-second animated logo reveal).
- Hashtags: `#ViralCookieOS`, `#ContentOps`, `#CreatorTools`
