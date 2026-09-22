# Page Patterns

Five page shapes cover nearly every screen. Match the closest one rather than
inventing a layout.

---

## 1. Page header

Every page opens with this block, inside `<div className="flex flex-col gap-6">`:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
    <p className="text-sm text-muted-foreground">
      Manage the complete opportunity lifecycle, from creation to closure.
    </p>
  </div>
  <Button onClick={() => setCreateOpen(true)}>
    <Plus /> Create Opportunity
  </Button>
</div>
```

Drop the wrapper's `justify-between` and the button when the page has no
primary action.

---

## 2. List page (header → KPIs → filters → table → pagination)

**Filter bar** — search input with an inset icon, plus selects:

```tsx
<div className="flex items-center gap-3">
  <div className="relative max-w-sm flex-1">
    <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input placeholder="Search by name or number..." className="pl-8"
           value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
  </div>
  <Select value={status} onValueChange={(v) => { setStatus(v as Status); setPage(1) }}>
    <SelectTrigger className="w-48">
      <SelectValue>
        {(value: Status | null) => !value || value === ALL ? 'All statuses' : LABELS[value]}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>All statuses</SelectItem>
      {STATUSES.map((s) => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}
    </SelectContent>
  </Select>
</div>
```

Three things that bite:
- **Any filter change resets `page` to 1.**
- **base-ui `SelectValue` renders the raw value**, not the item's label. Pass a
  render function that resolves the label, or a UUID leaks into the trigger.
- Sentinel constants for "no filter" / "unassigned" — `const ALL = '__all__'` —
  because `SelectItem` cannot hold an empty string value.

**Table** — wrapped so it gets a border and elevation:

```tsx
<div className="rounded-lg border shadow-xs">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Number</TableHead>
        <TableHead className="text-right">Value</TableHead>
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
    <TableBody>{/* the three states below */}</TableBody>
  </Table>
</div>
```

The last `TableHead` with `w-10` and no label is the row-actions column.

Column conventions: IDs `font-mono text-xs`, the name column `font-medium`,
money and percentages `text-right` (add `tabular-nums` when they animate),
missing values render as an em dash, never blank or "N/A".

**The three states** — always all three, in this order:

```tsx
{isPending ? (
  Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: COLS }).map((__, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
) : isError ? (
  <TableRow>
    <TableCell colSpan={COLS} className="h-32 text-center text-sm text-destructive">
      Failed to load opportunities{error instanceof Error ? `: ${error.message}` : ''}
    </TableCell>
  </TableRow>
) : data && data.items.length === 0 ? (
  <TableRow>
    <TableCell colSpan={COLS} className="h-32 text-center text-sm text-muted-foreground">
      No opportunities found. Create one to get started.
    </TableCell>
  </TableRow>
) : (
  data?.items.map((row) => <TableRow key={row.id}>{/* cells */}</TableRow>)
)}
```

**Clickable rows + row actions** — the row navigates; the actions cell stops
propagation:

```tsx
<TableRow className="cursor-pointer" onClick={() => navigate(`/opportunities/${opp.id}`)}>
  <TableCell onClick={(e) => e.stopPropagation()}>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onClone}><Copy /> Clone</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onArchive}><Trash2 /> Archive</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </TableCell>
</TableRow>
```

**Pagination** — only rendered when there is more than one page:

```tsx
{data && data.total_pages > 1 && (
  <div className="flex items-center justify-between">
    <p className="text-sm text-muted-foreground">
      Page {data.page} of {data.total_pages} &middot; {data.total} total
    </p>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>Previous</Button>
      <Button variant="outline" size="sm" disabled={page >= data.total_pages}
              onClick={() => setPage((p) => p + 1)}>Next</Button>
    </div>
  </div>
)}
```

---

## 3. Record workspace (nested route + tabs)

For any entity rich enough to need multiple views. Three files:

**`<entity>-workspace-layout.tsx`** — fetches the record once, handles pending /
error / not-found, then renders header + tabs + `<Outlet context={record} />`.
Children read it with `useOutletContext<Entity>()`.

```tsx
const activeTab = location.pathname.split('/').at(-1) || 'overview'

if (isPending) return (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
)

if (isError) {
  const notFound = error instanceof ApiError && error.status === 404
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">
        {notFound ? 'Opportunity not found' : 'Failed to load opportunity'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {notFound ? 'It may have been archived or the link is incorrect.' : message}
      </p>
      <Button variant="outline" onClick={() => navigate('/opportunities')}>
        Back to Opportunities
      </Button>
    </div>
  )
}

return (
  <div className="flex flex-col gap-4">
    <OpportunityHeader opportunity={opportunity} />
    <OpportunityTabsNav opportunityId={opportunity.id} activeTab={activeTab} />
    <Outlet context={opportunity} />
  </div>
)
```

The skeleton mirrors the real layout's proportions (header / tab strip / body),
so the page does not jump when data arrives.

**`<entity>-header.tsx`** — identity on the left, actions on the right,
separated from the tabs by `border-b pb-4`:

```tsx
<div className="flex flex-col gap-3 border-b pb-4">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{opp.opportunity_number}</span>
        <StatusBadge status={opp.status} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{opp.name}</h1>
      <p className="text-sm text-muted-foreground">{opp.customer.name}</p>
    </div>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm"><Pencil /> Edit</Button>
      <Button variant="outline" size="sm"><Copy /> Clone</Button>
    </div>
  </div>
</div>
```

Detail titles are `text-xl`, one step below a list page's `text-2xl`.

Not-yet-built actions render as a **disabled button wrapped in a Tooltip** —
never hidden, never a dead click:

```tsx
<Tooltip>
  <TooltipTrigger render={<Button variant="outline" size="sm" disabled />}>
    <Download /> Export
  </TooltipTrigger>
  <TooltipContent>Coming in a future milestone</TooltipContent>
</Tooltip>
```

**`<entity>-tabs-nav.tsx`** — tabs are URL state, driven by a `tab-config.ts`
array of `{ value, label, icon }`:

```tsx
<Tabs value={activeTab}
      onValueChange={(v) => navigate(`/opportunities/${id}/${v ?? 'overview'}`)}>
  <TabsList variant="line" className="w-full justify-start overflow-x-auto overflow-y-hidden scrollbar-thin">
    {WORKSPACE_TABS.map((tab) => (
      <TabsTrigger key={tab.value} value={tab.value}><tab.icon /> {tab.label}</TabsTrigger>
    ))}
  </TabsList>
</Tabs>
```

Use `variant="line"` (underline) for page-level navigation and the default
segmented variant for switching inside a card.

`overflow-x-auto` always pairs with `overflow-y-hidden` on this element. Setting
only `overflow-x` leaves `overflow-y` at its default `visible`, which the CSS
spec then silently promotes to `auto` — producing a spurious vertical
scrollbar (with default OS arrows) the moment the tab strip's height is off
by a sub-pixel, even though nothing is actually overflowing vertically. The
`scrollbar-thin` utility (`index.css`) keeps the horizontal scrollbar itself
thin and theme-colored instead of the browser default. Apply the same pairing
to any other element that scrolls on one axis only.

---

## 4. Dashboard

Header, then a KPI tile row, then content cards.

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {tiles.map((tile) => (
    <Card key={tile.label}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>{tile.label}</CardDescription>
          <tile.icon className="size-4 text-muted-foreground" />
        </div>
        {tile.pending
          ? <Skeleton className="h-8 w-12" />
          : <CardTitle className="text-2xl">{tile.value ?? '—'}</CardTitle>}
      </CardHeader>
    </Card>
  ))}
</div>
```

Note the inversion: the **label is the `CardDescription`** and the **number is
the `CardTitle`** — the value reads first. Tiles are header-only; no
`CardContent`. On error, the value degrades to
`<CardTitle className="text-lg text-muted-foreground">—</CardTitle>` rather than
showing a broken tile.

For a "recent items" card, use `CardContent className="flex flex-col divide-y"`
with `<button>` rows (`py-3 first:pt-0 last:pb-0 hover:opacity-80`), a two-line
label/meta stack on the left and a `StatusBadge` on the right.

Format numbers with a module-level `Intl.NumberFormat`, never inline:

```ts
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})
```

---

## 5. Form dialog (create / edit)

Split into three files so create and edit share the fields:
`<entity>-form-schema.ts` (zod), `<entity>-form-fields.tsx`, and
`create-…-dialog.tsx` / `edit-…-dialog.tsx`.

```tsx
const { register, handleSubmit, watch, setValue, reset, setError,
        formState: { errors, isSubmitting } } =
  useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

useEffect(() => { if (open) reset(DEFAULTS) }, [open, reset])   // reset on open, not on close

const onSubmit = handleSubmit(async (values) => {
  try {
    const created = await createMutation.mutateAsync(toPayload(values))
    onOpenChange(false)
    navigate(`/opportunities/${created.id}`)
  } catch (err) {
    setError('root', {
      message: err instanceof ApiError ? err.message : 'Failed to create opportunity',
    })
  }
})
```

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Create Opportunity</DialogTitle>
      <DialogDescription>Capture a new commercial opportunity.</DialogDescription>
    </DialogHeader>
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <OpportunityFormFields register={register} errors={errors} />
      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Opportunity'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

Server errors land on `root` and render above the footer — they are not thrown
away and not shown as a toast.

**Field grid and a single field:**

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div className="flex flex-col gap-1.5 sm:col-span-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" {...register('name')} />
    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
  </div>
</div>
```

`sm:col-span-2` for full-width fields. Empty-string form values convert to
`null` at the payload boundary, not in the schema. `Select` is a controlled
field (`watch` + `setValue(..., { shouldValidate: true })`) since it isn't a
native input, and needs a label-resolver map for its `SelectValue`.

**Destructive confirmation** uses `AlertDialog`, and the copy says what actually
happens and whether it is reversible:

> "{name} will be soft-deleted and removed from the opportunity list. This can
> be reversed later by an administrator; the record itself is never permanently
> deleted."

---

## Status badges

One `Record<Status, { label, className }>` map per entity, in a
`status-badge.tsx` next to the module. This is the sanctioned exception to
"tokens only" — Tailwind's `*-100/*-700` light, `*-950/*-300` dark:

```tsx
const STATUS_META: Record<Status, { label: string; className: string }> = {
  draft:        { label: 'Draft',        className: 'bg-muted text-muted-foreground' },
  discovery:    { label: 'Discovery',    className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  pricing:      { label: 'Pricing',      className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  quote_issued: { label: 'Quote Issued', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  won:          { label: 'Won',          className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  lost:         { label: 'Lost',         className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  cancelled:    { label: 'Cancelled',    className: 'bg-muted text-muted-foreground' },
}

export function StatusBadge({ status }: { status: Status }) {
  const meta = STATUS_META[status]
  return <Badge className={cn('font-medium', meta.className)}>{meta.label}</Badge>
}
```

**Hues encode lifecycle stage, and adjacent stages share a hue** — sky for
early/data-gathering, indigo for pricing/review, amber for issued/in-play,
emerald for won, red for lost, muted grey for inert (draft, cancelled). The
reader learns six colors, not twelve.

---

## Empty and placeholder screens

```tsx
<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3
                rounded-lg border border-dashed text-center">
  <Icon className="size-8 text-muted-foreground" />
  <h1 className="text-xl font-semibold">{title}</h1>
  <p className="max-w-md text-sm text-muted-foreground">{description}</p>
  <Badge variant="secondary">Coming in a future milestone</Badge>
</div>
```

`NotFoundPage` is this same component with `CircleAlert` and
"The page you are looking for does not exist yet."

---

## Wizard / multi-section flows

Left rail of sections + right content pane + a progress readout in the header.

Section rail buttons:

```tsx
<nav className="flex flex-col gap-1" aria-label="Discovery sections">
  <button type="button" onClick={() => onSelect(section.id)}
    className={cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
      isActive ? 'bg-accent text-accent-foreground font-medium'
               : 'text-muted-foreground hover:bg-accent/50',
    )}>
    <Icon className={cn('size-4 shrink-0',
      status === 'complete' && 'text-primary',
      status === 'in_progress' && 'text-amber-500')} />
    {section.name}
  </button>
</nav>
```

Status icons: `CheckCircle2` complete, `CircleDot` in-progress, `CircleDashed`
not-started. Progress readout is a right-aligned percentage over a `Progress` bar:

```tsx
<div className="flex w-48 flex-col items-end gap-1.5">
  <span className="text-sm font-medium">{percent}% complete</span>
  <Progress value={percent} className="w-full" />
</div>
```

---

## Component API conventions

- Dialogs are **controlled**: `{ open, onOpenChange }` props from the parent.
- Props typed inline for one or two props, as an `interface …Props` beyond that.
- Named exports throughout — `export function ThingPage()`. No default exports
  except `App`.
- Icons come in as `icon: LucideIcon` and render as `<Icon />` / `<tile.icon />`.
- Pure derivation logic (progress %, visibility rules) lives in
  `modules/<module>/lib/*.ts` with a colocated `*.test.ts`, so it is testable
  without rendering.
- Comments explain **why**, especially when the code looks wrong-but-isn't
  (a separate full-dataset query rather than deriving a count from a paged list;
  a label map because base-ui renders raw select values).
