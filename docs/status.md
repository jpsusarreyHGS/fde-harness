# Status

**Where the harness is, what is ready to use, and what to do next.**

Last verified 15 September 2026 by cloning the repo fresh and walking a full first session — setup, scaffold, drop a shadowing note, capture, accept, `/next`, audit. Every claim below was run, not recalled.

## The one-line answer

**Ready for a real engagement through stages 00–03 and G1.** Usable but manual from 04 onward. Not deployed — it is a terminal tool today.

---

## What is ready

| | |
|---|---|
| **A fresh clone runs** | `setup.sh` / `setup.ps1` check Node 24, install both packages, and name anything missing. No manual step |
| **Scaffolding** | `/init-engagement` → 32 directories, 58 files, a derived `state.json`, and a `Q-` raised for every value left `TBD` |
| **The intake loop** | Drop material in `evidence/<class>/` → `/capture` → skim a proposal → accept. Ids minted by code, never typed. An accept whose citations dangle is refused whole |
| **The evidence chain** | `map → grid → spec → build → eval → claim`, audited in code. Eight finding kinds, each with a location |
| **The coach** | `/next` — the conversations to have tomorrow, grouped by who can answer, ranked by what they block and how fast the answer perishes. Every item shows its reasoning |
| **The four tells** | Counted from the observation log, with the observation window beside them |
| **The ontology handoff** | `contract-check` runs the compiler's own four refusals locally and routes each through the coach |
| **ROI** | `cli.ts roi` computes all four outputs from the nine inputs and prints the working. Three buckets tracked |
| **Conformance** | Canon vendored in `docs/canon/`; `docs/conformance.md` records implemented / extension / divergent / missing |

15 slash commands · 50 templates · 41 instruments · 111 tests.

## What is usable but manual

Stages 04–09 ship good templates carrying real doctrine, and an FDE can work them — but they are tables to fill rather than tools that do something.

- The allocation grid, prioritisation and the cost envelope: no scoring code. The "take the lowest factor, not the average" rule is stated and unenforced.
- Eval golden sets: `evaluator` is told to write `06-Evals/golden-sets/<name>.md` with a precise schema, and **there is no template and no instruction to anchor it**, so `chain.evalCases` can only ever read zero. Highest-value gap in the back half.
- The gates recommend; nothing blocks. That is a deliberate design choice (`"a gate is a stop, not a status update"`), not an oversight.

## What is not there

- **No runtime.** Nothing runs an agent alongside a human and computes agreement — the shadow-mode harness the tooling map says is specifically ours. The ledger now records agreement by exception class and derives clustered-vs-scattered from counts; the numbers still arrive by hand.
- **No deployment.** `apps/web` builds and is read-only. A Vercel project was created on 10 September and is invisible to the MCP integration; the filesystem backend cannot work serverless, so a deploy needs Postgres plus `scripts/ingest.mjs` as the producer.
- **Groups 1 and 2 of the tooling map are absent** — agent registry, orchestrator, approval console, tool-call ledger, cost monitor. Roughly 10 of 44 Tier-1 components exist.

---

## Next steps, ranked

**1. Use it.** One FDE, one real engagement, through G1. Everything below is speculation until that has happened once. The exception register alone should pay for it.

**2. The golden-set template.** Half a day. `state.ts` already counts anchored register tables in `06-Evals/golden-sets/`; there is nothing to count because no template exists. G2 tests against a number the harness cannot produce.

**3. Decide whether the harness owns a runtime at all.** The map's build order puts Groups 0, 1 and 2 first and the harness skipped 1 and 2 — but Claude Code *is* the runtime. This is a strategic call, not a backlog item, and it decides whether the remaining 34 Tier-1 components are a roadmap or a misread.

**4. Deploy the console**, once someone can see the Vercel project. Needs Postgres, the three env vars, and Deployment Protection on *before* the first deploy — the repo is private HGS methodology.

**5. The smaller conformance gaps**, each cheap: the sponsor de-risking pillar, model tiering, the "prompted badly" MVP bar, four of eight operator questions, the seven-layer systems taxonomy. `docs/conformance.md` has the full list with the canon's own words.

## Open decisions

- **`/next` contradicts the tooling map**, which specifies the open-question queue as *"advisory — it does not decide what to ask next."* The tool is better than the spec; the map should be amended rather than the tool weakened. Recorded in `docs/conformance.md`, still undecided.
- **`use-cases.md` vs `spec.md`.** The method's contract table names files that exist in neither repo. `docs/contract.md` is canonical; the method text should follow.
- **Two engagements have never coexisted.** Everything is tested against one.

## Things to know before changing anything

- `03-Systems/ontology/` is a **published interface** read by `jpsusarreyHGS/ontology-compiler`, which names the harness as the schema's owner. A column rename there is an API change in another repository. Read `docs/contract.md` first and bump `CONTRACT_SCHEMA`.
- **There is no workspace root**, so `@hgs-fde/derive` resolves nowhere. Anything an agent invokes must be a `node packages/derive/src/cli.ts <subcommand>`, not a library import.
- Node 24 is the floor — everything under `packages/` runs TypeScript with no build step.
- Engagements are gitignored. Client material never enters the repo.
