# Layout, Navigation, Routing

## Provider stack

`src/App.tsx` — three providers, in this order, nothing else:

```tsx
<QueryClientProvider client={queryClient}>
  <TooltipProvider>
    <RouterProvider router={router} />
  </TooltipProvider>
</QueryClientProvider>
```

`src/main.tsx` is the stock Vite entry with `<StrictMode>` and `import './index.css'`.

## App shell

`src/layouts/app-layout.tsx` — collapsible icon sidebar, sticky header,
scrolling main with the app's only page padding:

```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <AppHeader />
    <main className="flex-1 overflow-auto bg-canvas p-6">
      <Outlet />
    </main>
  </SidebarInset>
</SidebarProvider>
```

Pages never set their own outer padding. `bg-canvas` on `<main>` is what
makes cards and tables read as raised panels rather than blending into the
page — see `design-tokens.md`.

## Sidebar

`src/components/layout/app-sidebar.tsx` — `<Sidebar collapsible="icon">`, a
header with the logomark + app name, and one `SidebarGroup` labelled
"Workspace" driven entirely by `nav-items.ts`.

The sidebar is chrome, not content: it wears the HGS navy (`--sidebar`) in
both light and dark mode, from the tokens in `index.css` — nothing in this
component itself sets color. `logo-mark.svg` is solid lime, so it needs no
adjustment sitting on navy.

Key details:
- Header: `border-b border-sidebar-border/70`, logo `size-5 shrink-0`, name
  `truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden`.
- Active state: `isActive={location.pathname.startsWith(item.path)}` — prefix
  match so a detail route keeps its parent lit.
- Links compose via base-ui `render`: `render={<Link to={item.path} />}`.
- `tooltip={item.title}` so the collapsed icon rail is still readable.

`nav-items.ts` is the single list of top-level modules:

```ts
export interface NavItem { title: string; path: string; icon: LucideIcon }

export const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  // …one per business module
]
```

## Header

`src/components/layout/app-header.tsx` — 56px, sticky, solid navy, always a
step **darker** than the sidebar (`--header`, derived from `--sidebar` via
`color-mix` — see `design-tokens.md`). Not translucent: chrome doesn't need
to blend with scrolled content the way a white header did in an earlier pass.

```tsx
<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2
                   border-b border-header-foreground/15 bg-header px-4
                   text-header-foreground">
  <SidebarTrigger className="text-header-foreground/70 hover:bg-header-foreground/10 hover:text-header-foreground" />
  <Separator orientation="vertical" className="h-6 bg-header-foreground/15" />
  <div className="flex-1" />           {/* spacer pushes actions right */}
  <Button variant="ghost" size="icon" aria-label="Notifications"
          className="text-header-foreground/70 hover:bg-header-foreground/10 hover:text-header-foreground">
    <Bell />
  </Button>
  <DropdownMenu>…account menu, same text-header-foreground/70 treatment…</DropdownMenu>
</header>
```

Icon-only buttons always carry `aria-label`. Build every header text/icon
state off `--header-foreground` with opacity modifiers
(`/70` idle, `/10` hover fill, full opacity on hover text) rather than the
global `--muted-foreground`/`--accent` tokens, which are tuned for content
surfaces and read as low-contrast or invisible on navy.

## Router

`src/router.tsx` — `createBrowserRouter`, one root route rendering `AppLayout`,
every page as a child. Conventions:

- `{ index: true, element: <Navigate to="/dashboard" replace /> }` at the root.
- Module list pages at `/<module>`.
- Record workspaces at `/<module>/:id` with a **nested layout** and one child
  route per tab, plus `{ index: true, element: <Navigate to="overview" replace /> }`.
- `{ path: '*', element: <NotFoundPage /> }` last.

Routes are imported eagerly. Add `React.lazy` only when a module measurably
bloats the bundle.

## Directory layout

```
src/
  components/
    layout/          app-header, app-sidebar, nav-items, placeholder-page, not-found-page
    ui/              shadcn primitives — do not hand-edit beyond token use
  hooks/             cross-module hooks (use-mobile, …)
  layouts/           app-layout, and any other shell
  lib/               utils (cn), api-client, query-client, demo-mode
  modules/<module>/  <module>-page.tsx
                     components/   module-local components
                     hooks/        module-local query hooks
                     lib/          module-local pure logic (+ .test.ts)
                     workspace/    record detail layout, header, tab-config, tabs/
  services/          <entity>-api.ts — one per backend resource
  types/             <entity>.ts — shared types and status unions
  mock/              in-memory demo data (see data-layer.md)
  test/              setup.ts, test-utils.tsx
```

Imports always use the `@/` alias, never relative `../../`.

## Adding a module

1. `src/modules/<module>/<module>-page.tsx`
2. Route under `AppLayout` children in `router.tsx`
3. Entry in `nav-items.ts`
4. If the backend isn't ready, render `PlaceholderPage`:

```tsx
<PlaceholderPage
  title="Quotes"
  description="Generate, version, and issue customer quotes."
  icon={FileText}
/>
```
