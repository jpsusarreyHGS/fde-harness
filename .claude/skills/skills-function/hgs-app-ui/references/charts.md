# Charts and Data Visualization

Recharts, always inside a `Card`, always reading colors from CSS variables so
the chart re-themes with the app.

## Chart card shell

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-base">Closed Revenue by Month</CardTitle>
    <CardDescription>Won vs. lost deal value by expected close month.</CardDescription>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={280}>
      {/* chart */}
    </ResponsiveContainer>
  </CardContent>
</Card>
```

`CardTitle className="text-base"` and a `CardDescription` that says what the
chart measures — the description is not optional; a chart without one makes the
reader guess at the denominator.

Standard height is **280px**. `ResponsiveContainer width="100%"` handles the rest.

## Axis and grid styling

Strip everything that isn't carrying information:

```tsx
<CartesianGrid vertical={false} stroke="var(--border)" />
<XAxis
  dataKey="monthLabel"
  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
  axisLine={{ stroke: 'var(--border)' }}
  tickLine={false}
/>
<YAxis
  tickFormatter={(v: number) => currencyFormatter.format(v)}
  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
  axisLine={false}
  tickLine={false}
  width={70}
/>
```

Rules: horizontal gridlines only (`vertical={false}`), no tick marks, no Y axis
line, 12px muted labels. Give the Y axis an explicit `width` when its formatted
labels are wide (currency needs ~70).

## Color

- **Categorical series** → `var(--chart-1)` through `var(--chart-8)`, in order.
- **Outcome / health series** → `var(--status-good)`, `--status-warning`,
  `--status-serious`, `--status-critical`.
- Never mix the two scales in one chart, and never hardcode a hex.
- Two-series good/bad comparisons (won vs. lost, pass vs. fail) always use
  `--status-good` / `--status-critical` so the meaning is consistent app-wide.

## Shared tooltip

One `ChartTooltip` in `modules/<module>/components/chart-tooltip.tsx`, passed to
every `<Tooltip content={…} />`. **Value leads** (strong, high-contrast), series
name follows in muted text, and each row is keyed with a short *line* of the
series color rather than a filled box:

```tsx
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label && <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.name ?? entry.dataKey} className="flex items-center gap-2 text-sm">
            <span className="h-0.5 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }} />
            <span className="font-semibold tabular-nums">
              {entry.value !== undefined && formatter ? formatter(entry.value) : entry.value}
            </span>
            <span className="text-xs text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Wire it with a formatter so the tooltip and the axis agree:

```tsx
<Tooltip
  cursor={{ fill: 'var(--muted)' }}
  content={<ChartTooltip formatter={(v) => currencyFormatter.format(Number(v))} />}
/>
```

`cursor={{ fill: 'var(--muted)' }}` for bar charts; `cursor={{ stroke: 'var(--border)' }}`
for line/area.

## Legend

```tsx
<Legend iconType="plainline"
        wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }} />
```

`plainline` matches the tooltip's line swatches. Omit the legend entirely for a
single-series chart — the card title already names it.

## Bars

```tsx
<Bar dataKey="won"  name="Won"  stackId="a" fill="var(--status-good)"
     radius={[0, 0, 0, 0]} maxBarSize={40} />
<Bar dataKey="lost" name="Lost" stackId="a" fill="var(--status-critical)"
     radius={[4, 4, 0, 0]} maxBarSize={40} />
```

In a stack, **only the topmost segment gets a top radius** — the ones beneath it
stay square so the stack reads as one column. `maxBarSize={40}` stops bars from
becoming slabs on wide screens. `name` is what shows in the legend and tooltip;
set it on every series.

## Formatting

Module-level `Intl` formatters, shared between axis, tooltip, and any table
beside the chart:

```ts
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})
```

Reshape data for display in the component, not in the data module:

```ts
const data = getMonthlyOutcomes().map((d) => ({ ...d, monthLabel: formatMonth(d.month) }))
```

## Analytics page layout

KPI row, then an asymmetric pair, then a symmetric pair, then a table:

```tsx
<div className="flex flex-col gap-6">
  {/* page header */}
  <KpiSummary />

  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div className="lg:col-span-2"><PipelineFunnelChart /></div>
    <WinLossChart />
  </div>

  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <RevenueTrendChart />
    <ModulePopularityChart />
  </div>

  <TopOpportunitiesTable />
</div>
```

Everything collapses to one column below `lg`. Each chart is its own component
file under `modules/analytics/components/`, fed by a single `analytics-data.ts`.
