---
name: hgs-app-ui
description: Build the frontend of an HGS enterprise web application — the React + Vite + Tailwind v4 + shadcn/base-ui stack, HGS navy/lime brand tokens, app shell (sidebar + header), and the page patterns (list, detail workspace, dashboard, form dialog, charts) used in HGS PriceCraft. Use whenever creating a new HGS app frontend, adding a screen/page/module to one, styling components, choosing colors or chart palettes, or when the user mentions HGS UI, HGS app, PriceCraft-style, or asks for an internal enterprise tool UI.
---

# HGS App UI

A house style for HGS internal enterprise web apps, extracted from HGS PriceCraft.
The register is **considered enterprise software** — Linear/Stripe density and restraint,
not a marketing site and not a playful dashboard. Navy carries meaning; lime is
reserved for the logomark and the occasional chart series.

## Step 0 — Which environment am I in?

The two reported failure modes of this skill — wrong fonts and misaligned
components — both come from silently degrading when a step in the happy path
fails. Decide the path **before** writing any UI code, and never fail silently.

**Path A — full toolchain** (Claude Code, Cowork, any shell with npm and
network access to the npm registry and the shadcn registry): follow
"When starting a NEW app" below exactly.

**Path B — constrained environment** (single-file artifact, no npm, registry
unreachable, or any `npm i` / `npx shadcn add` command that errors): do NOT
improvise approximations of the stack. Switch to
`references/fallback-primitives.md`, which specifies the Google Fonts Geist
fallback, the inline token setup, and the exact dimensional contract for
hand-written primitives so alignment survives without the shadcn components.

**Rule: a failed install is a fork in the road, not a speed bump.** If
`npm i @fontsource-variable/geist` or `npx shadcn@latest add ...` fails,
stop, state which path you are on, and proceed under Path B. The worst
outcome is a half-A/half-B build — real tokens with hand-rolled components
is exactly what produces "the colors are right but nothing lines up."

## When starting a NEW app

Scaffold in this order. Do not deviate from the stack — the tokens, the shadcn
`base-nova` style, and the base-ui primitives are a matched set.

```bash
npm create vite@latest <app-name> -- --template react-ts
```

Then:

1. **Install the stack** — see `assets/package.json` for the exact dependency set.
   Core: `tailwindcss` + `@tailwindcss/vite` (v4, no config file), `shadcn` (style
   `base-nova`), `@base-ui/react`, `lucide-react`, `class-variance-authority`,
   `clsx`, `tailwind-merge`, `tw-animate-css`, `@fontsource-variable/geist`.
   App layer: `react-router-dom`, `@tanstack/react-query`, `react-hook-form` +
   `zod` + `@hookform/resolvers`, `recharts`.
2. **Copy the design tokens** — `assets/index.css` verbatim into `src/index.css`.
   This is the whole visual identity; do not hand-roll colors after this.
3. **Copy the config** — `assets/components.json`, `assets/vite.config.ts`
   (the `@` → `./src` alias, fixed port, vitest block), `assets/.oxlintrc.json`.
4. **Copy the brand assets** — `assets/public/logo.svg` and `logo-mark.svg` into
   `public/`. Favicon is `logo-mark.svg`.
5. **Add UI primitives** as needed: `npx shadcn@latest add button card table ...`.
   They land in `src/components/ui/` and pick up the tokens automatically.
6. **Copy the app shell** — `assets/templates/` has ready `app-layout.tsx`,
   `app-sidebar.tsx`, `app-header.tsx`, `nav-items.ts`, `placeholder-page.tsx`,
   `utils.ts`, `api-client.ts`, `query-client.ts`.
7. **Build pages** following `references/page-patterns.md`.

## Non-negotiables

- **Tokens only.** Every color comes from a CSS variable (`bg-card`,
  `text-muted-foreground`, `var(--chart-3)`). No hex in components. The one
  sanctioned exception is the semantic status-badge palette in
  `references/page-patterns.md`, which pairs `*-100/*-700` light with
  `*-950/*-300` dark.
- **Dark mode always works.** Both `:root` and `.dark` are defined in the token
  file; any new token must be defined in both.
- **The sidebar and header are navy chrome, in both themes.** They don't
  re-theme with the rest of the app — `--sidebar` and the derived `--header`
  (always a step darker, via `color-mix`) carry the HGS navy whether the
  content is in light or dark mode. Main content sits on `--canvas` (a pale
  tint), not pure white, so cards and tables read as raised panels. See
  `references/design-tokens.md`.
- **Geist Variable**, with `font-feature-settings: "cv11", "ss01"` and
  `letter-spacing: -0.01em` on h1–h4. Headings are `font-semibold tracking-tight`,
  never bold-and-large. Geist rendering is *verified*, not assumed — see
  item 1 of the QA checklist; a silent fallback to the system stack is a
  bug to fix, not a cosmetic difference to ignore.
- **Lucide icons only**, rendered bare inside buttons (`<Button><Plus /> Create</Button>`)
  — the button variants already size and space them.
- **base-ui composition uses `render=`**, not `asChild`:
  `<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>`.
- **`cn()` for every conditional class** (`clsx` + `tailwind-merge`, `@/lib/utils`).
- **Every async surface has three states** — `Skeleton` while pending, a
  destructive-text row on error, a muted empty message when there are zero rows.
  Never render a bare spinner and never let a table collapse to nothing.
- **Layout gaps are `flex flex-col gap-6`** at page level, `gap-4` inside a
  section, `gap-1.5` inside a form field. Page padding is `p-6` (set by the
  layout's `<main>`, not by the page).
- **Single-axis scroll containers pair `overflow-x-auto` with
  `overflow-y-hidden`** (never leave the other axis at its `visible`
  default — the spec silently promotes it to `auto`, producing a spurious
  scrollbar) and take the `scrollbar-thin` utility. See
  `references/design-tokens.md`.

## Reference files

Read the one that matches the task; they are self-contained.

| File | Read it when |
|---|---|
| `references/design-tokens.md` | Choosing colors, shadows, radii, motion; adding a token; understanding the brand rationale |
| `references/layout-and-nav.md` | Setting up the app shell, sidebar, header, router, or adding a top-level module |
| `references/page-patterns.md` | Building any page — list, detail workspace, dashboard, form dialog, wizard, empty/loading/error states |
| `references/charts.md` | Any Recharts chart, KPI tile, or data visualization |
| `references/data-layer.md` | Wiring TanStack Query hooks, the API client, query keys, or demo mode |
| `references/fallback-primitives.md` | Path B: no npm / registry unreachable / single-file artifact — font fallback, inline tokens, and the dimensional contract for hand-written primitives |

`assets/README.md` lists every copy-ready file and its destination, plus the
exact `npm i` and `npx shadcn add` commands.

## Adding a screen to an existing HGS app

1. Add the route in `src/router.tsx` under the `AppLayout` children.
2. Add the nav entry in `src/components/layout/nav-items.ts` (title, path, Lucide icon).
3. Create `src/modules/<module>/<module>-page.tsx` — one directory per business
   module, with `components/`, `hooks/`, and `lib/` subdirectories as it grows.
4. Start from `PlaceholderPage` if the backend isn't ready; it renders a dashed
   card with icon, title, description, and a "Coming in a future milestone" badge.

## Page skeleton

Every top-level page opens the same way:

```tsx
export function ThingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Things</h1>
          <p className="text-sm text-muted-foreground">
            One sentence saying what this screen is for.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Create Thing
        </Button>
      </div>
      {/* KPI row, filters, table/content */}
    </div>
  )
}
```

## Alignment guardrails

The spacing scale alone doesn't guarantee alignment — these are the concrete
failure modes to check on every screen:

- **One control height per row.** Every interactive control sitting in the
  same horizontal row (search input, selects, buttons in a filter bar) is
  `h-9`. Never mix `h-9` inputs with `h-10` buttons or default-height
  selects — a 4px mismatch is what "sloppy" looks like.
- **Rows that contain controls use `items-center`**, not `items-start` and
  not the flex default. Page headers with a title block beside a button:
  `items-center justify-between` (title + description on the left are a
  nested `<div>`, so the button centers against the block, not the h1
  baseline).
- **Icons in buttons are never sized by hand.** `<Button><Plus /> Create</Button>`
  — the variants size (`size-4`) and gap them. A hand-set `className="w-5 h-5 mr-2"`
  breaks optical alignment against every other button.
- **KPI/stat card rows use `grid grid-cols-N gap-4`** (or responsive
  variants), never flex with grown children — grid guarantees equal widths,
  and identical internal structure guarantees equal heights. Don't let one
  card carry an extra line without giving all cards `h-full` content layout.
- **Numbers right-align, labels left-align** — in tables (`text-right` on
  both `TableHead` and `TableCell` of a money/percent column) and in KPI
  tiles. Add `tabular-nums` wherever numbers change or animate.
- **Vertical rhythm is the three gaps and nothing else** — `gap-6` between
  page sections, `gap-4` within a section, `gap-1.5` label-to-control. If
  you're reaching for `mt-3`, `mb-5`, or `space-y-2.5`, the structure is
  wrong; fix the flex container instead of patching with margins.
- **One place sets page padding** — the layout's `<main className="... p-6">`.
  A page that adds its own `p-4`/`px-8` double-pads and shifts every screen's
  left edge out of line with the rest of the app.

## Pre-delivery QA checklist

Run this before presenting any build. Do not skip it because the code
"looks right" — every item below has shipped broken while looking right in
the source.

1. **Font actually rendered.** Load the app and confirm the computed
   `font-family` on `<body>` resolves to Geist (devtools, or a screenshot
   where the distinctive single-story `a` from `"cv11"` is visible). If the
   fallback stack is rendering instead, the font import failed — fix it or
   switch to the Path B font delivery; do not ship and hope.
2. **Filter bars and header rows** — all controls in each row share the same
   rendered height and are vertically centered.
3. **Dark mode** — toggle `.dark` on `<html>`; chrome stays navy, content
   re-themes, nothing goes illegible.
4. **The three async states** — throttle or stub to see skeleton, error, and
   empty for at least one table; none collapse the layout.
5. **No hex leaked into components** — grep the diff for `#` color literals
   outside `index.css` and the sanctioned status-badge palette.
6. **Spacing audit** — grep for `mt-`, `mb-`, `space-y-` in page code; each
   hit needs a justification or a refactor to `gap`.
7. **Sidebar collapse** — icon rail shows tooltips, logo doesn't distort,
   active state survives.
8. **Zoom/overflow** — at 90% and 110% zoom nothing wraps into misalignment;
   horizontal scroll containers pair `overflow-x-auto overflow-y-hidden`.

## Anti-patterns

- Gradients, glassmorphism, oversized hero type, emoji in UI chrome.
- Lime (`--brand-lime`) as a button, link, or accent color. It is the logomark
  and, sparingly, a chart series.
- Raw `<div>` cards with hand-written borders — use `Card`.
- `useEffect` for data fetching — use TanStack Query.
- Inline `style` for anything but a dynamic chart series color.
- A second font family, or a second shadow scale.
