# @hgs-fde/derive

Derives `state.json` from an FDE engagement's markdown instruments, and audits the judgment chain.

**Zero runtime dependencies.** TypeScript run directly by Node ≥ 22.6; `typescript` is a devDependency for typechecking only.

This is the parser `render-dashboard/SKILL.md` promised as "one parser, in one place, testable". Before this package it was prose executed by a model. The runner uses it today; the web app's ingest endpoint uses the same code, so the parse never forks.

## Use

```bash
npm test          # 33 tests
npm run typecheck # tsc --noEmit, strict + noUncheckedIndexedAccess

node src/cli.ts <engagement-dir>                      # print state.json
node src/cli.ts <engagement-dir> --out state.json      # write it
node src/cli.ts <engagement-dir> --audit               # chain findings, gating exit code
```

The intake loop — `intake`, `sweep`, `anchors`, `propose`, `pending`, `accept`,
`reject`, `next`, `contract-check` — is documented in the root `CLAUDE.md`.
`sweep` is the floor under a capture: what a source names (people with roles,
systems, acronyms, figures), printed so a proposal can be checked against it.
`propose` prints that comparison as a coverage block, and flags an instrument
the source supported that got no rows.

Exit codes are for a runner and for CI:

| Code | Meaning |
|---|---|
| `0` | derived cleanly |
| `1` | `--audit` found a blocking defect (unsourced requirement or dangling citation) |
| `2` | bad invocation |
| `3` | **the files claim something untrue** — refuses to emit |

## API

```ts
import { deriveState, scaffoldEngagement, validateState } from "@hgs-fde/derive";

// create an engagement from the templates — no interactive prompts
await scaffoldEngagement({ engagementsRoot, templatesDir, vars });

// derive state from what is on disk
const state = await deriveState({ engagementDir, slug });

// check the invariants a shape check cannot express
const violations = validateState(state);
```

## How parsing works

Tables are found by **anchor**, never by heading:

```
<!-- table:observation-log.rows role=register id=Id -->
<!-- table:stakeholder-map.labour role=kv -->
<!-- table:autonomy-ladder.rungs role=labels key=Rung -->
```

| `role` | Counted? | Why |
|---|---|---|
| `register` | **yes** | One row per object |
| `kv` | no | Two-column key/value block |
| `labels` | no | Fixed dimension rows shipped by the template — the five roles, the five rungs, the four tests. **The rows are the schema, not data** |

A heading can be reworded without breaking the parse. Renaming an anchor is a deliberate schema change.

Three further safeguards, each of which exists because the alternative silently fabricates state:

- **Unanchored tables are ignored.** Instruments hold prose tables and worked examples that must never reach derived state.
- **Blank and placeholder rows do not count.** A stray `| | | |` left behind by hand-editing would otherwise inflate every ratio.
- **Option lists are not values.** A cell reading `READY · READY WITH CAVEATS · NOT READY` is template guidance; reading it as a decision would fabricate a gate verdict. `filled()` rejects it.

## The chain audit

The reason this package exists. Seven finding kinds, each with an id and a location — a count with no location is not actionable:

| Finding | Catches |
|---|---|
| `dangling-citation` | A `Source` citing an id that does not exist. Usually a renumbering that should never have happened |
| `unsourced-requirement` | A requirement with no `Source` and no `ASSUMPTION` tag |
| `orphan-evidence` | Evidence captured and cited nowhere — a gap in the analysis, or an observation that was not needed |
| `unowned-assumption` | An assumption with no owner or no confirm-by date: a guess with a permanent home |
| `stale-unverified` | Stated-only evidence that has survived into placement. The class that surfaces at UAT |
| `allocation-without-reason` | The reason is the artefact. `"ok"` is rejected — at G2 the grid must survive challenge |
| `exception-without-rule-holder` | The ceiling on eval quality: an exception nobody can adjudicate |

## Invariants `validateState` enforces

Shape is already guaranteed by the TypeScript types, since both consumers are TypeScript. What needs guarding is **tampering** and arithmetic that cannot be true:

- **A gate claiming `passed` with no `decidedBy` or no date.** Code never sets `passed`; a person does, with a name.
- **A rung ≥ 3 with no agreement figure.** A demo is not a measurement.
- **Audit counts that disagree with the findings they summarise.**
- Parts exceeding wholes — sourced > total, class counts > evidence total, pass+fail > cases.
- Stage `pct` outside 0–100, or a status that contradicts its `pct`.
- Anything other than the runbook's ten stages.

The first three are graded `tampered` and make the CLI refuse to emit. `state.json` is derived, never authoritative — if it disagrees with the files, the files are right.

## Tests

| Suite | Proves |
|---|---|
| `anchors.test.ts` | Row splitting, including escaped pipes as literal content |
| `fresh.test.ts` | **Scaffolds from the real templates** and asserts all-zero counts, every instrument `empty`, no audit findings, ten stages in order, three gates `not-run`, and that the registry has not drifted from the templates |
| `seeded.test.ts` | A deliberately defective engagement: every audit finding fires on exactly the row it should, and a gate assessed but undecided derives `caveats`, never `passed` |

`fresh.test.ts` is the load-bearing one. If a freshly initialised engagement ever looks half-populated, every ratio on the dashboard is a lie.

## Not included

**No JSON Schema.** Both consumers are TypeScript, so a schema would duplicate the types and rot against them, while the checks that actually matter — tampering, arithmetic — are not expressible in one. `validateState` covers those instead. If a non-TypeScript consumer appears, generate the schema from the types rather than hand-writing it.
