# @hgs-fde/web — FDE engagement console

Read-only visibility over derived engagement state. Next 15 App Router, four runtime dependencies.

**It runs with no database.** With `DATABASE_URL` unset it reads `engagements/*/state.json` straight from the harness — exactly where `/dashboard` writes it. Set `DATABASE_URL` and it reads Postgres instead, fed by the runner through `/api/ingest`. That means this is reviewable with nothing provisioned.

## Run it

```bash
npm --prefix apps/web install
npm --prefix apps/web run dev      # http://localhost:3100
```

For anything to show, derive an engagement first:

```bash
node packages/derive/src/cli.ts engagements/<slug> --out engagements/<slug>/state.json
```

## Views

| Route | Shows |
|---|---|
| `/` | Portfolio, sorted by what needs attention: failed or caveated gates first. Plus practice health and a gate matrix |
| `/e/<slug>` | The engagement: stage pipeline `00`–`09`, gate strip, **judgment chain**, chain audit, instruments, gate criteria and behaviours, questions and RAID, autonomy, ops |
| `/api/engagements` | The portfolio as JSON |
| `/api/ingest` | `POST` from the runner. Needs `x-ingest-key` |

The hero is the **judgment chain as an attrition funnel** — observed evidence → exceptions with a named rule holder → sourced requirements → allocations with a written reason → promoted objects → answerable competency questions → passing eval cases. Attrition at a link is where the work is.

## Environment

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres backend | Unset ⇒ filesystem backend. The console footer says which is live |
| `HARNESS_ROOT` | filesystem backend | Defaults to two levels up from `cwd` |
| `INGEST_SECRET` | `/api/ingest` | Compared in constant time. Unset ⇒ ingest returns 503 |
| `APP_SECRET` | token signing | **Required in production**, ≥16 chars. Dev falls back to an ephemeral secret |

## Auth in this phase

**Vercel Deployment Protection**, configured in the Vercel dashboard, not in code — Project → Settings → Deployment Protection → Vercel Authentication or Password.

That is deliberate for an internal MVP: it is a real gate at the edge, and it beats rolling local passwords for a tool with a handful of users. Entra ID SSO replaces it in Phase 5, at which point per-engagement read scoping becomes necessary — engagement material is client-confidential and this phase has no row-level authorisation at all.

`middleware.ts` is **default-closed**: every non-GET request to `/api/*` is refused with 405 except the self-authenticating ingest route. The ontology repo had no middleware, so a route was public until someone remembered to guard it — a footgun at six routes and a liability at thirty.

## Deploy

**Not deployed yet, on purpose.** The 404 squad Vercel team is role-limited: it can accept a first production deployment and then blocks further ones and cannot list deployments. A deploy there today can report success and leave you unable to correct it.

So: raise the role first, or deploy to the personal team. When ready:

- Vercel root directory → `apps/web`
- Set `APP_SECRET`, and `DATABASE_URL` + `INGEST_SECRET` once a database exists
- Turn on Deployment Protection **before** the first deploy, not after
- Note the Hobby function ceiling of 60s if you ever move agent work into a route — which is why the pipeline lives on the runner instead

## What was ported, and what was not

Ported from the ontology repo's app, with changes noted:

| From | Change on the way over |
|---|---|
| `lib/crypto.ts` | The hash format now carries its scrypt cost parameters, so they can be re-tuned without a second format |
| `lib/http.ts` | The rate limiter now **evicts expired buckets** — the original leaked one Map entry per IP forever. It is still per-instance, so on serverless it is a speed bump, not a limit |
| `next.config.mjs` headers | Copied wholesale, tightened for this app's font and style origins |

Not ported: the SPARQL template registry, the Fuseki client, the credit-union role matrix, the chat UI, and the dark-only stylesheet. See `packages/derive/README.md` for why the app was harvested rather than forked.

## Why JSONB and not a normalised schema yet

The plan called for relational tables with composite `(slug, id)` keys and soft deletes. That is right, and it is not yet earned — this phase is read-only, so nothing needs row-level identity.

The normalised tables land with Phase 4's approval inbox, because a decision attached to a row must outlive an edit to the markdown. The ids are already immutable and append-only in the markdown, so nothing about that migration is blocked. Detail in `lib/store.ts`.

## Trust boundary

`/api/ingest` re-checks the invariant the derive CLI already enforces: a gate claiming `passed` with no `decidedBy` is **rejected**, not stored. Re-checking at the boundary is the same pattern as the two-phase write — the caller is not trusted to have checked.

A rejection returns 422 with the reason, so the runner's log carries something actionable rather than a bare 4xx.
