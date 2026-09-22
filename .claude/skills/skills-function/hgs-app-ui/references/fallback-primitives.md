# Path B — Constrained Environments & Fallback Primitives

Read this when the full toolchain isn't available: single-file HTML artifact,
no npm, npm registry or shadcn registry unreachable, or any install command
that errored. The goal on Path B is identical output *fidelity* — same
tokens, same type, same alignment — achieved without the build pipeline.

**Never mix paths.** If shadcn components couldn't be installed, hand-write
*all* primitives to the contract below rather than pairing two installed
components with three improvised ones.

---

## 1. Font delivery without npm

`@fontsource-variable/geist` needs a bundler. Without one, load Geist from
Google Fonts (available there since 2024; `fonts.googleapis.com` is allowed
in published-artifact CSPs):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..800&display=swap" rel="stylesheet" />
```

The Google Fonts family name is `Geist` (not `Geist Variable`), which is why
the token stack in `index.css` lists both. Keep the full fallback stack —
if even the font CDN is unreachable, Inter/system-ui degrade gracefully:

```css
--font-sans: 'Geist Variable', 'Geist', 'Inter', ui-sans-serif, system-ui,
  -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

Still apply the typographic identity manually:

```css
body { font-family: var(--font-sans); font-feature-settings: "cv11", "ss01"; }
h1, h2, h3, h4 { letter-spacing: -0.01em; font-weight: 600; }
```

**Verify before building pages**: computed `font-family` on `<body>` must
resolve to Geist. If it doesn't, fix delivery first — every sizing decision
downstream assumes Geist's metrics.

## 2. Tokens without a build step

Copy the `:root`, `.dark`, and `@layer base` blocks of `assets/index.css`
into a plain `<style>` tag verbatim — they are framework-free CSS and work
anywhere. The `@theme inline` block is Tailwind-v4-specific; on Path B you
consume the variables directly (`background: var(--card)`) or, if using the
Tailwind play CDN, register them inside
`<style type="text/tailwindcss">` per the CDN's v4 syntax.

If Tailwind isn't available at all, write plain CSS against the variables.
Colors still come **only** from the tokens — Path B changes the delivery
mechanism, never the palette.

## 3. The dimensional contract

This is what keeps hand-written primitives aligned with each other. These
are the effective dimensions of the shadcn components the tokens were tuned
against. All values assume the 14px (`text-sm`) base that controls use.

| Primitive | Contract |
|---|---|
| **Button (default)** | height 36px (`h-9`), padding-x 16px, `text-sm font-medium`, gap 8px to icon, `rounded-md`, icon 16px (`size-4`) |
| **Button (sm)** | height 32px (`h-8`), padding-x 12px, otherwise as default |
| **Button (icon)** | 36×36px (`size-9`), icon 16px centered, no padding math by hand |
| **Input / SelectTrigger** | height 36px (`h-9`), padding-x 12px, `text-sm`, `rounded-md`, 1px `var(--border)` border, `bg-background` |
| **Inset-icon input** | icon 16px, absolutely positioned `left-2.5 top-1/2 -translate-y-1/2`, input gets `padding-left: 32px` (`pl-8`) |
| **Card** | `rounded-lg` (= `var(--radius)`), 1px border, `bg-card`, `shadow-xs`; header/content/footer padding 24px (`p-6`) |
| **Table head cell** | height 40px (`h-10`), padding-x 8px, `text-sm font-medium text-muted-foreground`, `align-middle` |
| **Table body cell** | padding 8px (`p-2`), `text-sm`, `align-middle` |
| **Badge** | height ~22px via `text-xs font-medium` + padding 2px/10px, `rounded-md` |
| **Skeleton** | `rounded-md`, `bg-muted`, subtle pulse animation |
| **Checkbox / Radio** | 16px (`size-4`), 1px border, `rounded-[4px]` / full |

Cross-cutting rules (the actual alignment guarantees):

- **Every control that can share a row with another control is 36px tall.**
  This single invariant eliminates most "didn't line up" reports.
- Rows of controls: `display: flex; align-items: center; gap: 12px`.
- Focus ring: `outline: 2px solid var(--ring); outline-offset: 2px` — same
  treatment on every focusable primitive, no per-component variants.
- Disabled: `opacity: 0.5; pointer-events: none` uniformly.
- Hover/press transitions: `var(--duration-fast) var(--ease-premium)` on
  background/border only — never on layout properties.

## 4. Path B page assembly

The page patterns in `references/page-patterns.md` still apply — the shapes,
the three async states, the header block, the spacing scale (24px between
sections, 16px within, 6px label-to-control on Path B's plain-CSS
equivalents). Only the component *implementation* changes; the layout
grammar does not.

## 5. Path B QA additions

On top of the main checklist in `SKILL.md`:

1. Confirm the Google Fonts request actually loaded (network tab or a
   rendered-glyph check) — a blocked font CDN silently falls through to the
   stack, which is acceptable *only* if noted to the user.
2. Measure two controls from different primitives side by side (e.g., an
   input next to a button) and confirm both render 36px.
3. Confirm no primitive invented its own radius, shadow, or focus style
   outside the contract.
