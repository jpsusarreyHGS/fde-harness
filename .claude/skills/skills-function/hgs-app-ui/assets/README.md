# Assets — what to copy where

Everything here is copy-ready. Paths are relative to the new app's frontend root.

| Asset | Destination | Notes |
|---|---|---|
| `index.css` | `src/index.css` | **Verbatim.** The entire visual identity. |
| `components.json` | `components.json` | shadcn config — style `base-nova`, base color `neutral`, lucide icons, `@/` aliases. |
| `vite.config.ts` | `vite.config.ts` | `@` → `./src` alias, react + tailwind plugins, fixed port, vitest/jsdom block. Change the port per app. |
| `oxlintrc.json` | `.oxlintrc.json` | Rename with the leading dot. |
| `package.json` | — | Reference dependency set; copy the blocks, don't overwrite the generated file. |
| `public/logo.svg` | `public/logo.svg` | Full HGS lockup — navy wordmark, lime mark. |
| `public/logo-mark.svg` | `public/logo-mark.svg` | Icon only. Sidebar header **and** favicon. |
| `templates/lib/*.ts` | `src/lib/` | `utils.ts` (cn), `api-client.ts`, `query-client.ts`, `demo-mode.ts`. |
| `templates/layouts/app-layout.tsx` | `src/layouts/` | Sidebar + header + scrolling main. |
| `templates/components/layout/*` | `src/components/layout/` | Header, sidebar, nav-items, placeholder, not-found. Edit `APP_NAME` in `app-sidebar.tsx` and the module list in `nav-items.ts`. |
| `templates/test-utils.tsx` | `src/test/test-utils.tsx` | Also create `src/test/setup.ts` containing `import '@testing-library/jest-dom/vitest'`. |

## Install

```bash
npm i @base-ui/react @fontsource-variable/geist @hookform/resolvers @tailwindcss/vite @tanstack/react-query class-variance-authority clsx lucide-react react-hook-form react-router-dom recharts shadcn tailwind-merge tailwindcss tw-animate-css zod
```

```bash
npm i -D @testing-library/jest-dom @testing-library/react @testing-library/user-event @types/node @vitest/coverage-v8 jsdom oxlint vitest
```

## Add UI primitives

```bash
npx shadcn@latest add accordion alert-dialog avatar badge breadcrumb button card dialog dropdown-menu input label progress scroll-area select separator sheet sidebar skeleton table tabs textarea tooltip
```

That is the exact set HGS PriceCraft uses. They read the tokens in `index.css`
automatically — add them *after* copying it.

## index.html

```html
<link rel="icon" type="image/svg+xml" href="/logo-mark.svg" />
<title>HGS &lt;App Name&gt;</title>
```
