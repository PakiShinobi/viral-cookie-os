# Viral Cookie OS — Design System

> Single source of truth for all UI decisions. When something isn't covered here, look at what already exists in the codebase and extend consistently — don't invent new patterns.

---

## Colour Tokens

Defined in `src/app/globals.css` via Tailwind v4 `@theme`. All tokens are available as Tailwind utility classes: `bg-surface`, `text-muted`, `border-border`, etc.

### Base

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--color-background` | `#0f0f14` | `bg-background` | Page canvas, body |
| `--color-foreground` | `#e2e2e8` | `text-foreground` | Primary body text |
| `--color-muted` | `#71717a` | `text-muted` | Secondary text, labels, placeholders |

### Surfaces

Surfaces layer on top of the background. Higher numbers = more lifted.

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--color-surface` | `#17171d` | `bg-surface` | Cards, panels, sidebar, tables |
| `--color-surface-2` | `#1e1e26` | `bg-surface-2` | Form inputs, hover states, nested elements |

### Borders

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--color-border` | `#252530` | `border-border` | Default card/input borders, dividers |
| `--color-border-strong` | `#2d2d3a` | `border-border-strong` | Hover-state borders on ghost buttons |

### Accent

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--color-accent` | `#f43f5e` | `bg-accent`, `text-accent` | Primary actions, active nav, brand mark |
| `--color-accent-hover` | `#e11d48` | `bg-accent-hover` | Hover state of primary button |
| `--color-accent-subtle` | `#f43f5e` at 12% | `bg-accent-subtle` | Background wash behind accent elements |

### Semantic

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `--color-success` | `#10b981` | `text-success`, `bg-success/10` | Positive states, done/published |
| `--color-warning` | `#f59e0b` | `text-warning`, `bg-warning/10` | In-progress, pending, running |
| `--color-error` | `#f87171` | `text-error`, `bg-error/10` | Failures, validation errors |

**Opacity pattern for semantic backgrounds:** Use `/10` opacity modifier — `bg-success/10`, `bg-error/10`, `bg-warning/10`. This gives a consistent low-saturation tint on any dark surface without hardcoding a colour.

---

## Typography Scale

Font: **Inter** (loaded via `next/font/google`). Applied globally as `font-sans antialiased`.

### Scale

| Role | Class | Size | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| Page title | `text-2xl font-semibold tracking-tight text-foreground` | 24px | 600 | tight | Every page `<h1>` |
| Section heading | `text-[15px] font-semibold text-foreground` | 15px | 600 | — | Major sections within a page |
| Card header | `text-[13px] font-semibold text-foreground` | 13px | 600 | — | Card and panel titles |
| Structural label | `text-[11px] font-medium uppercase tracking-wider text-muted` | 11px | 500 | wider | Table column headers, section dividers |
| Body | `text-sm text-foreground` | 14px | 400 | — | General content |
| Body small | `text-[13px] text-muted` | 13px | 400 | — | Table cells, descriptions, secondary content |
| Caption / meta | `text-xs text-muted` | 12px | 400 | — | Timestamps, tag labels, helper text |
| Micro | `text-[11px] text-muted` | 11px | 400 | — | Sidebar email, badge counts |

### Rules

- **Page titles** always: `text-2xl font-semibold tracking-tight text-foreground`. No exceptions.
- **Numbers that count** (metrics, queue counts): add `tabular-nums` so digits don't shift width.
- **Structural labels** (table headers, section dividers inside forms): always `uppercase tracking-wider text-muted text-[11px] font-medium`. Never use these as card headers.
- **Don't use `font-bold`** anywhere in the UI — `font-semibold` (600) is the heaviest weight used. `font-medium` (500) for labels and nav items.

---

## Spacing Rules

Built on an 8px base unit. Use Tailwind's spacing scale — avoid arbitrary pixel values.

### Component internal spacing

| Context | Value | Class |
|---|---|---|
| Card padding | 20px | `p-5` |
| Card padding (form container) | 24px | `p-6` |
| Card header padding | `16px 16px` | `px-4 py-3` |
| Table cell padding | `16px 12px` | `px-4 py-3` |
| Form field gap | 20px | `space-y-5` |
| Input label to input gap | 4px | implicit via `mt-1` on input |
| Button group gap | 12px | `gap-3` |

### Layout spacing

| Context | Value | Class |
|---|---|---|
| Page header to content | 32px | `mb-8` on header block |
| Between page sections | 32px | `space-y-8` |
| Between cards in a grid | 12px | `gap-3` |
| Between cards in a grid (2-col) | 16px | `gap-4` |
| Nav item vertical gap | 2px | `space-y-0.5` |

### What not to do

- Don't use `space-y-10` (40px) between sections — it's too loose.
- Don't use `space-y-0.5` (2px) between list items — use `space-y-1` minimum.
- Don't mix `mt-*` arbitrary values in a single component — pick one system value for each gap.
- Don't use `min-h-[80px]` or other raw pixel heights — use Tailwind scale values.

---

## Layout Primitives

### App shell

```
┌─────────────────────────────────────────────────────┐
│  bg-background  h-screen  flex                      │
│  ┌──────────┐  ┌────────────────────────────────┐   │
│  │ Sidebar  │  │ <main>                         │   │
│  │ w-56     │  │ flex-1  overflow-y-auto  p-8   │   │
│  │ bg-surface│  │ bg-background                  │   │
│  └──────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- Sidebar: `w-56` (224px), `bg-surface`, `border-r border-border`
- Main: `flex-1 overflow-y-auto p-8` — 32px padding on all sides

### Page content wrapper

Every page's root element:

```tsx
// Dashboard-style (data-heavy, wide)
<div className="mx-auto max-w-5xl space-y-8">

// Form-style (focused, narrow)
<div className="mx-auto max-w-2xl">
```

`max-w-5xl` (1024px) for pages with grids and tables.
`max-w-2xl` (672px) for forms and focused single-column pages.
`max-w-3xl` (768px) for content detail — between the two.

### Page header block

Every page uses this exact pattern:

```tsx
<div className="mb-8">
  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
    Page Title
  </h1>
  <p className="mt-1 text-sm text-muted">
    One-line description of what this page does.
  </p>
</div>
```

When the header needs an action button (e.g. New Content):

```tsx
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
    Page Title
  </h1>
  <PrimaryButton>Action</PrimaryButton>
</div>
```

No `mb-8` wrapper needed here — the `space-y-8` on the parent handles it.

### Grid systems

```tsx
// 4-column metric grid
<div className="grid grid-cols-2 gap-3 md:grid-cols-4">

// 3-column queue/panel grid
<div className="grid gap-3 md:grid-cols-3">

// 2-column panel grid
<div className="grid gap-4 md:grid-cols-2">
```

---

## Card System

Cards are the primary container for all content. One consistent shape throughout.

### Base card

```tsx
<div className="rounded-xl border border-border bg-surface">
  {/* content */}
</div>
```

### Card with header

```tsx
<div className="rounded-xl border border-border bg-surface">
  <div className="border-b border-border px-4 py-3">
    <h3 className="text-[13px] font-semibold text-foreground">Title</h3>
  </div>
  <div className="p-5">
    {/* content */}
  </div>
</div>
```

### Card with padded content (forms, detail views)

```tsx
<div className="rounded-xl border border-border bg-surface p-6">
  {/* content */}
</div>
```

### Card header with count badge

Used in `ActionQueue` — when a card header needs a count indicator:

```tsx
<div className="border-b border-border px-4 py-3">
  <div className="flex items-center justify-between">
    <h3 className="text-[13px] font-semibold text-foreground">Queue Title</h3>
    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted tabular-nums">
      {count}
    </span>
  </div>
</div>
```

### Rules

- Always `rounded-xl`. Not `rounded-lg`, not `rounded`.
- Always `border border-border`. Never a box-shadow.
- Always `bg-surface`. Never `bg-background` (that's the page canvas).
- Never nest a card inside a card — use `bg-surface-2` for nested elements instead.

---

## Button Variants

### Primary

The main call-to-action. One per page or section.

```tsx
<button className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
  Action
</button>
```

Full-width variant (forms with a single submit):

```tsx
<button className="w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
  Submit
</button>
```

Note: `py-2` for inline buttons, `py-2.5` for full-width form submits.

### Ghost (secondary)

For cancel actions and secondary choices alongside a primary:

```tsx
<Link className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground">
  Cancel
</Link>
```

### Text button

For low-hierarchy actions — add CTA, sign out, inline links:

```tsx
<button className="text-[13px] text-accent hover:text-accent-hover transition-colors">
  + Add item
</button>

<button className="text-[11px] text-muted hover:text-foreground transition-colors">
  Sign out
</button>
```

### Rules

- `rounded-lg` on all buttons. Not `rounded-xl`, not `rounded`.
- `text-[13px]` always. Not `text-sm` (14px) — the slight difference matters at this size.
- `font-medium` always. Not `font-semibold` for buttons.
- `transition-colors` always. No `duration-*` modifier needed.
- `disabled:opacity-50` always on submit buttons with async state.
- Never use `bg-blue-600` or any arbitrary colour — only `bg-accent`.

---

## Form Styles

### Input (text, email, password, url)

```tsx
const inputClass =
  "mt-1 block w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent";
```

### Select

Same class as input. The browser renders the dropdown arrow natively — no custom styling needed.

### Textarea

Same class as input. Set `rows` explicitly. Never let it auto-size without constraint.

### Field wrapper

```tsx
<div>
  <label htmlFor="field-id" className="block text-[13px] font-medium text-foreground">
    Label text
    <span className="ml-1 text-[11px] font-normal text-muted">(optional)</span>
  </label>
  <input id="field-id" name="field-id" className={inputClass} />
</div>
```

- `for`/`id` pairing is required — always include both.
- Optional fields: append `(optional)` as a muted span inside the label — not below it.
- Required markers: use `<span className="text-error">*</span>` inside the label, not `required` text.

### Form sections (grouped fields)

When a form has multiple conceptual groups, wrap each in a card with a structural label:

```tsx
<div className="rounded-xl border border-border bg-surface p-5">
  <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted">
    Section Name
  </h2>
  <div className="space-y-4">
    {/* fields */}
  </div>
</div>
```

Never use `<hr>` + `<h2>` to separate form sections.

### Error state

Inline field error (below the input):
```tsx
<p className="text-[13px] text-error">Error message here</p>
```

Form-level error (above the submit button, or at the top of the form):
```tsx
<div className="rounded-lg bg-error/10 px-3 py-2.5 text-[13px] text-error">
  Something went wrong
</div>
```

### Loading/pending state

```tsx
<button disabled={isPending} className="... disabled:opacity-50">
  {isPending ? "Saving..." : "Save"}
</button>
```

Pending label convention: verb + `...` — "Saving...", "Creating...", "Generating...".

---

## Badge System

Badges convey status. Two categories: stage (content pipeline) and operational (cron/publish status).

### Content stage badges

```tsx
const stageBadgeColor: Record<string, string> = {
  idea:       "bg-zinc-500/10 text-zinc-400",
  brief:      "bg-blue-500/10 text-blue-400",
  script:     "bg-purple-500/10 text-purple-400",
  record:     "bg-orange-500/10 text-orange-400",
  edit:       "bg-yellow-500/10 text-yellow-400",
  review:     "bg-cyan-500/10 text-cyan-400",
  publish:    "bg-green-500/10 text-green-400",
  distribute: "bg-emerald-500/10 text-emerald-400",
  archived:   "bg-zinc-500/5 text-zinc-600",
};

// Usage
<span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${stageBadgeColor[stage]}`}>
  {stage}
</span>
```

### Operational status badges

```tsx
// Cron status
success:  "bg-success/10 text-success"
failed:   "bg-error/10 text-error"
running:  "bg-warning/10 text-warning"

// Publish status
published: "bg-success/10 text-success"
pending:   "bg-warning/10 text-warning"
failed:    "bg-error/10 text-error"
```

### Badge shape rules

- `rounded` (4px), not `rounded-full`. Rectangular badges read as status; pills read as tags/categories.
- `px-1.5 py-0.5` — compact, never padded.
- `text-[11px] font-medium` always.
- Background always uses the `/10` opacity modifier — never a solid colour.

---

## Table System

### Wrapper

```tsx
<div className="overflow-hidden rounded-xl border border-border bg-surface">
  <table className="w-full">
```

The `overflow-hidden` on the wrapper clips the table's corners to the card's `rounded-xl`.

### Header row

```tsx
<thead>
  <tr className="border-b border-border">
    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
      Column
    </th>
  </tr>
</thead>
```

### Body

```tsx
<tbody className="divide-y divide-border">
  <tr className="transition-colors hover:bg-surface-2">
    <td className="px-4 py-3 text-[13px] text-muted">
      Cell content
    </td>
  </tr>
</tbody>
```

Use `divide-y divide-border` on `<tbody>` — not `border-b` on each `<tr>`.

### Rules

- Column headers: always `uppercase tracking-wider text-[11px] font-medium text-muted`.
- Cell text: `text-[13px]` — never `text-sm` (the 1px matters in dense tables).
- Primary cell content (titles, links): `text-foreground font-medium`.
- Secondary cell content (type, date, meta): `text-muted`.
- Row hover: `hover:bg-surface-2 transition-colors`.
- Never use `last:border-b-0` — use `divide-y` on tbody instead.

---

## Navigation / Sidebar

### Sidebar structure

```
bg-surface  w-56  border-r border-border
├── Header  px-4 py-[18px]  border-b border-border
│   └── Brand mark (22×22 rounded-md bg-accent) + wordmark
├── Nav  flex-1 p-2
│   └── <ul> space-y-0.5
│       └── <li><Link> — nav item
└── Footer  px-4 py-4  border-t border-border
    ├── email  text-[11px] text-muted truncate
    └── Sign out  text-[11px] text-muted hover:text-foreground
```

### Nav item states

```tsx
// Default
"flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"

// Active
"flex items-center gap-2.5 rounded-md px-3 py-[7px] text-[13px] font-medium bg-surface-2 text-foreground"
```

Active detection: `pathname.startsWith(link.href)`.

### Nav icons

All nav icons are 15×15 inline SVGs with `aria-hidden="true"`. They inherit colour via `currentColor`. No icon library dependency.

---

## Interaction States

### Hover

- Backgrounds: `hover:bg-surface-2` (for list items, table rows, nav links)
- Text: `hover:text-foreground` (for muted text that becomes primary on hover)
- Borders: `hover:border-border-strong` (for ghost buttons)
- Accent links: `hover:text-accent-hover`
- All: `transition-colors` — no duration modifier

### Focus (form inputs)

```
focus:border-accent focus:ring-1 focus:ring-accent outline-none
```

Applied to all inputs, selects, textareas. `outline-none` removes the browser default; the ring replaces it.

### Active / pressed

No custom active state — the browser default is sufficient. Don't add `active:scale-95` or similar micro-animations.

### Disabled

```
disabled:opacity-50
```

Applied only to buttons with async/pending state. Never disable an input — show an error instead.

### Loading

Text label changes to `Verb...` form. Button opacity is unchanged while loading; `disabled:opacity-50` fires because `disabled` is set.

### Empty states

Contained within the primary card for the section:

```tsx
<div className="rounded-xl border border-border bg-surface py-16 text-center">
  <p className="text-sm text-muted">Nothing here yet</p>
  <Link href="..." className="mt-3 inline-block text-[13px] font-medium text-accent hover:text-accent-hover">
    Create the first one
  </Link>
</div>
```

---

## Navigation Breadcrumb / Back Links

For detail pages, a back link sits above the `<h1>`:

```tsx
<div>
  <Link href="/section" className="text-[13px] text-muted transition-colors hover:text-foreground">
    ← Section name
  </Link>
</div>
```

Keep this to one level. No full breadcrumb trail needed in the current IA.

---

## Calendar Status Colours

```tsx
const statusColors: Record<string, string> = {
  planned:     "bg-blue-500/10 text-blue-400 hover:bg-blue-500/15",
  in_progress: "bg-orange-500/10 text-orange-400 hover:bg-orange-500/15",
  done:        "bg-green-500/10 text-green-400 hover:bg-green-500/15",
  skipped:     "bg-zinc-500/5 text-zinc-600 hover:bg-zinc-500/10",
};
```

Calendar slot chips: `rounded px-1.5 py-0.5 text-[11px]`. Same shape as badges.

---

## Dos and Don'ts

### Do

- Use design tokens (`bg-surface`, `text-muted`, `border-border`) — not raw hex or raw Tailwind colour classes like `bg-slate-900`.
- Use `rounded-xl` for cards and containers, `rounded-lg` for buttons and inputs, `rounded` for badges and chips.
- Use `text-[13px]` for body content in tables and lists (not `text-sm`).
- Use `divide-y divide-border` on `<tbody>` elements instead of border on each row.
- Use the `/10` opacity modifier for semantic background tints.

### Don't

- Don't use `bg-white` anywhere — there is no white in this design system.
- Don't use `bg-slate-*`, `bg-zinc-*`, or any raw colour classes for layout surfaces — only for badge colours.
- Don't use `rounded-full` on status badges — use `rounded`.
- Don't use `box-shadow` for card depth — use `border border-border` and the surface layer system.
- Don't use `font-bold` — `font-semibold` is the maximum.
- Don't add hover effects to non-interactive elements.
- Don't invent new section-separator patterns — use the card + structural label pattern for form groups.
- Don't hardcode `bg-blue-600` or any action colour — always `bg-accent`.
