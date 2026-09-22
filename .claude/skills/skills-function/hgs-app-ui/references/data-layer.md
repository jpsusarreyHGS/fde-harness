# Data Layer

Three layers, strictly separated: **api-client** (transport) → **services**
(one file per backend resource) → **hooks** (TanStack Query). Components only
ever touch hooks.

## API client — `src/lib/api-client.ts`

A ~40-line fetch wrapper. No axios, no generated client.

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8002/api/v1'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.detail ?? response.statusText)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const apiClient = {
  get:    <T>(path: string) => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST',
            body: body !== undefined ? JSON.stringify(body) : undefined }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

`ApiError` carries `status`, which is what lets UI distinguish 404 ("not found,
maybe archived") from everything else. Error message prefers the FastAPI
`detail` field, falls back to `statusText`.

## Query client — `src/lib/query-client.ts`

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
})
```

One-minute stale time, one retry, no refocus refetch — enterprise CRUD data
doesn't change under the user's feet, and refetch-on-focus is disorienting when
someone alt-tabs to a spreadsheet mid-form.

## Services — `src/services/<entity>-api.ts`

One module per backend resource, exporting a plain object of functions. This is
also the seam where demo mode swaps in mocks — see below.

```ts
export const opportunitiesApi = {
  list:   (params: OpportunityListParams) => apiClient.get<Page<Opportunity>>(`/opportunities?${qs(params)}`),
  get:    (id: string) => apiClient.get<Opportunity>(`/opportunities/${id}`),
  create: (payload: OpportunityCreateInput) => apiClient.post<Opportunity>('/opportunities', payload),
  update: (id: string, payload: OpportunityUpdateInput) => apiClient.put<Opportunity>(`/opportunities/${id}`, payload),
  kpis:   () => apiClient.get<OpportunityKpis>('/opportunities/kpis'),
}
```

## Hooks — `src/modules/<module>/hooks/use-<entity>.ts`

**Every module defines a hierarchical query-key factory.** This is what makes
`invalidateQueries({ queryKey: keys.all })` blow away lists, details, and KPIs
in one call.

```ts
const opportunityKeys = {
  all:     ['opportunities'] as const,
  lists:   () => [...opportunityKeys.all, 'list'] as const,
  list:    (params: OpportunityListParams) => [...opportunityKeys.lists(), params] as const,
  details: () => [...opportunityKeys.all, 'detail'] as const,
  detail:  (id: string) => [...opportunityKeys.details(), id] as const,
  kpis:    () => [...opportunityKeys.all, 'kpis'] as const,
}

export function useOpportunities(params: OpportunityListParams) {
  return useQuery({ queryKey: opportunityKeys.list(params), queryFn: () => opportunitiesApi.list(params) })
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: opportunityKeys.detail(id),
    queryFn: () => opportunitiesApi.get(id),
    enabled: Boolean(id),          // route params can be undefined on first render
  })
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OpportunityCreateInput) => opportunitiesApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opportunityKeys.all }),
  })
}
```

Conventions:
- The params object goes **into** the list key, so pagination and filters get
  their own cache entries and going back a page is instant.
- Mutations invalidate `keys.all`, not a narrower key — a create changes the
  list, the total, and the KPIs.
- `enabled: Boolean(id)` on any query keyed off a route param.
- Read `isPending` / `isError` / `error` in the component; never call
  `queryClient.fetchQuery` from a component.
- One `use-lookups.ts` per module for the reference-data selects (customers,
  users) shared across its forms.

## Types — `src/types/<entity>.ts`

Types and the status union live outside the module so services, hooks, and
components all import the same shape:

```ts
export const OPPORTUNITY_STATUSES = ['draft', 'discovery', 'pricing', 'won', 'lost'] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]
```

The `as const` array doubles as the source for select options and for the
`Record<Status, …>` label and badge maps — add a status in one place and
TypeScript reports every map that needs updating.

## Demo mode

So the whole app runs standalone for an executive demo — no backend, no
database — with a single env flag and **no other code changes**.

```ts
// src/lib/demo-mode.ts
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true'
}

// A small artificial delay so demo interactions feel like they're talking to a
// real network, rather than resolving instantly (which reads as obviously fake).
export function demoDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

Each service branches at the top of each function:

```ts
list: async (params) => {
  if (isDemoMode()) { await demoDelay(); return mockStore.list(params) }
  return apiClient.get<Page<Opportunity>>(`/opportunities?${qs(params)}`)
}
```

Mock data lives in `src/mock/` — plain modules plus an `<entity>-store.ts` that
keeps in-memory mutations so create/edit/archive work during a demo. Hooks,
components, and query keys are identical in both modes.

If a screen has no backend at all yet, it may read a mock module directly — but
say so in a comment naming the file and what will replace it.

## Env vars

```
VITE_API_BASE_URL=http://localhost:8002/api/v1
VITE_DEMO_MODE=false
```

Always read through a helper or with a `??` default; never bare
`import.meta.env.X` scattered through components.

## Testing

`src/test/test-utils.tsx` exports `renderWithProviders`, wrapping in a fresh
`QueryClient` (with `retry: false`) and a `MemoryRouter`:

```tsx
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}
export * from '@testing-library/react'
```

Import everything from `@/test/test-utils`, never from `@testing-library/react`
directly. Vitest + jsdom, `setupFiles: ['./src/test/setup.ts']` which pulls in
`@testing-library/jest-dom/vitest`.

Test the pure logic in `modules/<module>/lib/*.test.ts` and the presentational
branches of small components (status badge, progress tracker, validation
summary). Don't test the shadcn primitives.
