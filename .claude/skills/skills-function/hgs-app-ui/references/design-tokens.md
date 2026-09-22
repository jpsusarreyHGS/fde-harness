# Design Tokens

The whole visual identity lives in `src/index.css`. Copy `assets/index.css`
verbatim; treat it as the single source of truth and edit it rather than
overriding colors in components.

## Structure of the file

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/geist";

@custom-variant dark (&:is(.dark *));

@theme inline { /* maps --color-* utilities onto the raw vars, plus radii, shadows, motion */ }
:root  { /* light palette */ }
.dark  { /* dark palette */ }
@layer base { /* border/outline defaults, body colors, font features, heading tracking */ }
```

The `--font-sans` token carries a full fallback stack (`'Geist Variable',
'Geist', 'Inter', ui-sans-serif, system-ui, ...`) so a failed font load
degrades to a metrically-similar grotesque instead of the browser default.
This is a safety net, not a license: verify Geist actually rendered (computed
`font-family` on `<body>`) before building pages, and if the fontsource
import can't resolve, use the Google Fonts delivery in
`references/fallback-primitives.md`.

Tailwind v4 — there is **no `tailwind.config.js`**. New scale entries are
registered inside `@theme inline`; new colors are registered as
`--color-<name>: var(--<name>)` there and defined under both `:root` and `.dark`.

## Brand

```
--brand-navy: #26476b   (light)  /  #4a729e (dark)
--brand-lime: #abcf02   (both)
```

Taken from the HGS mark: deep navy wordmark, lime icon. **Navy carries primary
actions, focus rings, and active navigation. Lime is used sparingly** — the
logomark itself and a handful of chart series — never as a UI-wide accent.
Enterprise software should read as considered, not playful.

## Semantic palette

Light (`:root`):

| Token | Light | Dark |
|---|---|---|
| `--background` | `#ffffff` | `#0a0f18` |
| `--foreground` | `#0f172a` | `#f1f5f9` |
| `--card` | `#ffffff` | `#101826` |
| `--popover` | `#ffffff` | `#101826` |
| `--primary` | `var(--brand-navy)` | `#6f93bd` |
| `--primary-foreground` | `#ffffff` | `#0a0f18` |
| `--secondary` / `--muted` | `#f1f5f9` | `#1a2333` |
| `--muted-foreground` | `#64748b` | `#94a3b8` |
| `--accent` | `#eef2f7` | `#1c2740` |
| `--destructive` | `#dc2626` | `#f87171` |
| `--border` / `--input` | `#e2e8f0` | `rgb(255 255 255 / 10–12%)` |
| `--ring` | `color-mix(in oklch, var(--brand-navy) 55%, white)` | `color-mix(… #6f93bd 60%, white)` |

Sidebar has its own parallel set (`--sidebar`, `--sidebar-foreground`,
`--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`).
Unlike the semantic palette above, this set does **not** re-theme between
light and dark — it's brand chrome, not content, so it stays the HGS navy
(`--brand-navy`) in both. Only the exact shade of navy shifts a step deeper
in dark mode (`#16283c` vs. light's `--brand-navy`), so it doesn't read as
brighter than the dark content it frames.

`--header` is the header's own background — always a step **darker** than
whatever `--sidebar` currently is, via
`color-mix(in srgb, var(--sidebar) 78%, black)`. It is derived, not a second
hardcoded color per theme, so the header/sidebar contrast holds automatically
if the navy ever changes. `--header-foreground` is white in both themes;
build header text/icon states off it with opacity modifiers
(`text-header-foreground/70`, `hover:bg-header-foreground/10`) rather than
inventing more tokens.

`--canvas` is the page background sitting behind cards and tables in `<main>`
— a pale tint (`var(--muted)` in light, `var(--background)` in dark), kept
distinct from `--background` (which stays white/darkest and is what cards,
popovers, and inputs use). The point is that panels read as raised surfaces
against a tinted canvas instead of blending into a flat page. Apply it once,
as `bg-canvas` on `<main>` in `app-layout.tsx` — never on `body`, and never on
a card or table itself.

## Chart and status colors

Eight categorical chart slots, tuned for both themes:

```
--chart-1 #2a78d6 blue      --chart-5 #4a3aa7 violet
--chart-2 #1baf7a green     --chart-6 #e34948 red
--chart-3 #eda100 amber     --chart-7 #e87ba4 pink
--chart-4 #008300 deep grn  --chart-8 #eb6834 orange
```

Four status colors, **identical in light and dark** (they encode meaning, not mood):

```
--status-good     #0ca30c
--status-warning  #fab219
--status-serious  #ec835a
--status-critical #d03b3b
```

Use `--status-*` for good/bad semantics (won vs. lost, healthy vs. breached) and
`--chart-N` in order for categorical series. Never mix the two scales in one chart.
See `charts.md`.

## Radius scale

One knob, `--radius: 0.625rem`, multiplied out:

```
--radius-sm  0.6×   --radius-lg  1×     --radius-2xl 1.8×   --radius-4xl 2.6×
--radius-md  0.8×   --radius-xl  1.4×   --radius-3xl 2.2×
```

Cards are `rounded-xl`, buttons `rounded-lg`, badges `rounded-4xl` (pill).

## Elevation

Soft, low-opacity, **multi-layer** shadows in the Linear/Stripe register — an
ambient layer plus a tighter key shadow — registered under `--shadow-*` so they
override Tailwind's stock single-layer `shadow-xs/sm/md/lg/xl` app-wide with no
per-component changes.

```css
--shadow-xs: 0 1px 2px 0 rgb(15 23 42 / 0.04);
--shadow-sm: 0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 1px 0 rgb(15 23 42 / 0.03);
--shadow-md: 0 4px 8px -2px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04);
--shadow-lg: 0 12px 20px -6px rgb(15 23 42 / 0.08), 0 4px 8px -4px rgb(15 23 42 / 0.04);
--shadow-xl: 0 24px 40px -10px rgb(15 23 42 / 0.12), 0 8px 16px -8px rgb(15 23 42 / 0.06);
```

In practice: cards and table wrappers get `shadow-xs`, popovers/tooltips
`shadow-md`, dialogs `shadow-lg`. Nothing in the app uses `shadow-xl`.

## Motion

One shared easing curve — a gentle decelerate, not linear and not bouncy —
layered on top of base-ui's own open/close transitions:

```css
--ease-premium: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 120ms;
--duration-base: 180ms;
```

Hover and press states use `transition-all` with these; buttons also carry
`active:not-aria-[haspopup]:translate-y-px` for a 1px press.

## Scrollbars

`color-scheme: light` / `html.dark { color-scheme: dark }` in the base layer
keep native scrollbars matched to the app's own theme rather than the OS/
browser preference — otherwise a light page can render dark-styled
scrollbars (or the reverse) that look mismatched.

The `.scrollbar-thin` utility gives any single-axis-scrolling element (a tab
strip, a horizontally-scrolling table) a thin, theme-colored scrollbar
instead of the browser default. Always pair the scrolling axis's `overflow-*`
with the other axis set to `hidden` (`overflow-x-auto overflow-y-hidden`) —
leaving the other axis at its default `visible` gets silently promoted to
`auto` by the CSS spec, producing a spurious scrollbar on that axis.

## Typography

```
--font-sans: 'Geist Variable', sans-serif
--font-heading: var(--font-sans)   /* deliberately the same */
```

Base layer:

```css
body { font-feature-settings: "cv11", "ss01"; }   /* single-storey a, alt g */
h1, h2, h3, h4 { letter-spacing: -0.01em; }
```

Scale actually used in the app:

| Role | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` |
| Detail/record title | `text-xl font-semibold tracking-tight` |
| Card title | `text-base leading-snug font-medium` (default in `CardTitle`) |
| KPI number | `text-2xl` on `CardTitle` |
| Body / table cell | `text-sm` |
| Secondary / description | `text-sm text-muted-foreground` |
| Meta, field errors, badges | `text-xs` |
| IDs and codes | `font-mono text-xs text-muted-foreground` |
| Numbers in a column | add `tabular-nums`, right-align with `text-right` |

## Adding a token

1. Define it in **both** `:root` and `.dark`.
2. Register it in `@theme inline` as `--color-<name>: var(--<name>)` so
   `bg-<name>` / `text-<name>` utilities exist.
3. Use the utility, not `var()`, in JSX — except inside Recharts props, where
   `fill="var(--chart-1)"` is correct.
