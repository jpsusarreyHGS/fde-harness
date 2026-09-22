# Engagement instructions — HGS FDE harness

This is the HGS Forward Deployed Engineering harness. Follow these rules at all times. If you are starting a session, read the primer below first.

**The practice documents are canon.** Both are vendored in `docs/canon/` so
conformance is checkable from a clone, and they own different things:

| Source | Owns |
|---|---|
| `docs/canon/fde-engagement-runbook.html` | The ten stages, their outputs, and every named framework — the operating map, the five roles, the four tells, the allocation grid, two-axis prioritisation, the four tests, the autonomy ladder, the ROI model |
| `docs/canon/fde-bootcamp-complete.html` | The three gate bars and the five certified behaviours. **The runbook contains no gates** — no G1, no readiness criteria, no held-out slice |
| `docs/canon/fde-platform-tooling-map.html` | The tool inventory the harness is measured against — 91 components in eight groups, with a stated build order |

Where the harness and a canon document disagree, **the canon document wins**
and the divergence is a defect to report. Where the two canon documents
disagree, say so rather than picking one — `docs/conformance.md` records the
known cases.

**Never attribute a gate to the runbook.** Gates come from the bootcamp, and
three places used to say otherwise.

## What this harness does

An FDE engagement runs the runbook's ten stages, `00` through `09`. The harness carries the method for each stage and produces the artefacts that pass its gates.

| Stage | Runbook name | What it establishes |
|---|---|---|
| `00` | Before you land | The engagement is set up so it can succeed: audit scoped and charged for, sponsor de-risked, stack chosen |
| `01` | Map the organisation | The five roles, their decision rights, and the approval path |
| `02` | Gather the real workflow | The operating map and the exception inventory, as observed |
| `03` | Analyse the systems | Systems inventory, readiness scorecard, vocabulary audit, and the canonical model |
| `04` | Place the intelligence | The allocation grid and the ranked matrix — including what we recommend not automating |
| `05` | Build the MVP | A working system that survives contact, built for the unhappy paths |
| `06` | Prove it with evals | The four tests, a failure taxonomy, and a regression gate |
| `07` | Ship into production | The autonomy ladder walked rung by rung, and adoption |
| `08` | Calculate the ROI | The engagement ROI model and the executive readout |
| `09` | Run the loop again | Retrospective, and a contribution back to the pattern library |

**Delivery is evidence-first, not conversation-first.** What people say about their work is reliably not what their work is. A one-hour meeting gets you what someone thinks their job is; eight hours beside them gets you the job. Transcripts and SOPs are corroborating evidence. The primary source is watching someone do the work.

## The judgment chain

Every artefact traces to evidence:

```
map → grid → spec → build → eval → claim
```

**Any broken link is a defect, and it is named.** Concretely, in harness objects:

```
observation (EV-) → exception (EX-) → requirement (REQ-) → allocation (AL-)
  → ontology object → competency question (CQ-) → eval case → claim
```

**Enforce it at write time, not review time:**

- A requirement with no `Source:` is not a requirement. Route it to `open-questions.md`, or label it `ASSUMPTION` with a named owner.
- An allocation with no written reason is not an allocation. The reason is the artefact.
- An ontology entity with no requirement behind it is speculative modelling. Park it in the backlog.
- A competency question nobody asks is a query you wrote for yourself. Cut it.
- An eval case with no exception or competency question behind it tests nothing that matters.
- A claim with no eval behind it is a hope.

When you cannot close a link, **say so explicitly**. An honest gap is a finding. A silently-filled gap is a defect that surfaces at UAT.

## The boundary rule (read this before writing any file)

| | Lives in | Is | Example |
|---|---|---|---|
| **Asset** | `.claude/skills/skills-practice/`, `.claude/templates/` | Reusable across every client | The observation protocol; the allocation-grid template |
| **Instance** | `engagements/<slug>/` | True for exactly one client | This client's operating map |

1. **Every instance is seeded by an asset.** Do not hand-roll an artefact that has a template. If the template is wrong, fix the template and say so.
2. **Every engagement returns something to the library at close.** The bootcamp makes this a certification requirement — "at least one contribution to the pattern library, accepted by the library owner." An engagement that compounds nothing is staffing, not a practice.

Client-calibrated skills are an **instance**, so they live at `engagements/<slug>/skills-engagement/`, never inside `.claude/`.

## Agents and delegation

The harness is a **team of specialist subagents**. The session you are in is the **orchestrator** — it understands the request, routes it, sequences the work, and holds context. The specialists do the domain work.

**Delegate by default.** The method lives in the agent files, and only the agent that owns a task carries those instructions. The main thread **does not run discovery, model, architect, build or evaluate directly.**

| Agent | Owns | Stages |
|---|---|---|
| **discovery-analyst** | Observation, operating map, exception inventory, requirements, open questions | `01`–`03` |
| **ontology-engineer** | Vocabulary audit, canonical model, competency questions, promotion to the ontology repo | `03` |
| **solution-architect** | The allocation grid, prioritisation, architecture, the build plan, and the build loop | `04`–`05` |
| **engagement-manager** | Setup, charter, roadmap, RAID, scope changes, gate readiness, ROI model | `00`, `08` |
| **builder** | Implements the MVP — pipelines, connectors, governed templates, surface | `05` |
| **evaluator** | The four tests, golden sets, failure taxonomy, regression gate, autonomy measurement | `06`–`07` |
| **chronicle** | Session log and engagement memory | all |
| **harness-improver** | Reviews the harness, proposes improvements, runs the library contribution at close | `09` |

**Model selection** is pinned per agent by **blast radius**, not difficulty. Check the agent's own frontmatter; do not hardcode model names elsewhere.

**Two things when you dispatch:**

- **Subagents do not auto-load skills.** Every dispatch must **name the skills to read first**.
- **Name the engagement and the stage.** An agent guessing which client it is on will read the wrong files.

## Session-start orientation

Read these **in order**, before any exploration:

0. **Confirm you can see the engagement.** `git rev-parse --show-toplevel` must
   be the harness root, and `engagements/<slug>/` must exist there. Engagement
   folders are gitignored — client data never enters the repo — so a session
   isolated in a fresh git worktree holds none of them, and every agent command
   runs `node scripts/preflight.mjs engagements/<slug>` before it dispatches.
   If that fails, stop and say so; do not explore, and do not dispatch.
1. `engagements/<slug>/state.json` — machine-readable state; also what the dashboard renders
2. `engagements/<slug>/chronicle/memory/MEMORY.md` — the index; follow its links
3. `engagements/<slug>/chronicle/CHRONICLE.md`, then the latest `chronicle/sessions/YYYY-MM-DD-NNN.md`
4. `node packages/derive/src/cli.ts intake engagements/<slug>` — and `pending` after it

Then, to plan rather than report:

```bash
node packages/derive/src/cli.ts next engagements/<slug>
```

Steps 1–3 are the *recorded* state. **Step 4 is the state nobody has recorded
yet**, and it is the one an FDE is most likely to have just changed: `state.json`
is derived from register rows, so a transcript dropped this morning is invisible
to it. If material is waiting, say so first and offer `/capture` — reporting
coverage over registers that do not contain it is a confident wrong answer.

Full engagement state in three reads plus one command. **Do not Glob, Bash-enumerate, or dispatch an Explore subagent until you have read them** — the indexes *are* the directory map, and this overrides the generic "explore first" instinct. If `state.json` is missing, fall back to MEMORY + CHRONICLE plus one Glob, and tell the operator to run `/init-engagement`.

## Skills: load before you act

| Doing… | Read first (under `.claude/skills/`) |
|---|---|
| Shadowing, capture, the four tells | `skills-practice/observation-protocol` |
| Turning evidence into sourced requirements | `skills-practice/requirements-elicitation` |
| Placing intelligence — the allocation grid, prioritisation, cost envelope | `skills-practice/allocation-grid` |
| Vocabulary, canonical grain, competency questions, promotion | `skills-practice/ontology-first-delivery` |
| Consent, residency, redaction, works councils | `skills-practice/evidence-handling` |
| The four tests, failure taxonomy, golden datasets | `skills-practice/four-tests` |
| Walking a system up the autonomy ladder | `skills-practice/autonomy-ladder` |
| Deciding whether a stage gate holds | `skills-practice/stage-gates` |
| Baselines, the ROI model, the executive readout | `skills-practice/roi-and-readout` |

**Three skill directories:**

- **`.claude/skills/skills-practice/`** — the practice's canonical method, refreshed from upstream
- **`engagements/<slug>/skills-engagement/`** — client-calibrated; **supersedes** practice skills for that engagement
- **`.claude/skills/skills-function/`** — harness operation

**Supersede rule.** Where an engagement skill and a practice skill cover the same topic, the engagement one wins — read both, prefer the engagement values, and say which applied.

**Cite by full path, and do not stop at `SKILL.md`.** It is the index; read the supporting files that carry the rules.

## Guardrails

### Client data

- **Nothing enters `datasources/` until the evidence-handling terms are settled** — residency, retention, redaction, access, deletion, onward use. `discovery-analyst` hard-stops without them.
- **`datasources/` is read-only.** Convert and derive into the engagement folder; never write back.
- **Desktop task mining and session replay are employee monitoring.** In works-council jurisdictions and unionised environments they require **consultation, not notice**. Getting this wrong ends an engagement.
- **No client-identifying material in `skills-practice/` or `.claude/templates/`.** Generalise first; that is a deliberate step at close.

### Intake — raw material in, structure out

**The FDE produces raw material; the harness produces structure.** Eight hours beside the operator gets you the job — an FDE spending those hours typing into tables is not watching, which is the one thing only they can do.

Drop whatever already exists into the folder that says what it is:

```
02-Workflow/evidence/observed/     an FDE watched it
02-Workflow/evidence/system/       a log, export or record
02-Workflow/evidence/documented/   an SOP, policy or spec
02-Workflow/evidence/stated/       an interview, call or transcript
```

**The evidence class comes from the folder, never from the content.** That is the point: the discipline the whole judgment chain rests on becomes structural instead of something to remember at the end of a long day. A confident-sounding transcript in `stated/` can never silently become primary evidence, and a file dropped outside a class folder is reported rather than guessed.

Then `/capture` extracts rows and writes them as **proposed rows — a file the FDE reviews, then accepts** (a *proposal*, in the CLI's and the folder's name). Nothing reaches a register until the FDE accepts it, and **ids are minted by code at accept time** — never by an agent, never typed by a human. In anything a first-time user reads, say "proposed rows (review, then accept)" before you say "proposal" — the bare word was the first thing a trainee got stuck on.

```bash
node packages/derive/src/cli.ts intake  <engagement-dir>              # what is waiting
node packages/derive/src/cli.ts sweep   <engagement-dir> <source>     # the floor under a capture: people, systems, figures
node packages/derive/src/cli.ts anchors <engagement-dir> [filter]     # the real columns, and the keys a fill lands on
node packages/derive/src/cli.ts propose <engagement-dir> <spec.json>  # agents write this; prints coverage against the sweep
node packages/derive/src/cli.ts pending <engagement-dir>              # awaiting a decision
node packages/derive/src/cli.ts accept  <engagement-dir> <proposal.md>
node packages/derive/src/cli.ts reject  <engagement-dir> <proposal.md> "<reason>"
node packages/derive/src/cli.ts next    <engagement-dir> [groups]     # what to verify, then what to ask
node packages/derive/src/cli.ts answer  <engagement-dir> "<Q-id or question>" "<answer>" --from "<who>"
                                                                       # a chat answer, written into evidence/stated/ for /capture
node packages/derive/src/cli.ts sketch  <engagement-dir>              # the pre-G1 alignment sketch, accepted rows only
node packages/derive/src/cli.ts contract-check <engagement-dir>       # will the compiler take it?
```

Three rules follow, none optional:

- **Never hand-write a register row when `/capture` could propose it**, and never hand-assign an id. Minting by eye is a read-then-write race, and a collision corrupts every citation pointing at it.
- **An accept whose citations dangle is refused whole.** A partial accept leaves the register in a state nobody chose.
- **`03-Systems/ontology/` is a published interface, not a working folder.**
  `jpsusarreyHGS/ontology-compiler` reads it and says so in its own source:
  *"The harness is the authority for this format; if the two ever diverge, the
  harness wins."* An anchor rename or a column rename there is an API change
  in another repository — read `docs/contract.md` first, and bump
  `CONTRACT_SCHEMA` when you make one.
- **Never re-rank the queue by hand.** `/next` joins what a question blocks to
  the prioritisation table and says so in its `why:` line. Presenting a
  different order, or the same order with a better-sounding reason, is the
  console's old lie — it rendered "ranked by what is blocked" over a sort by
  age. If the ranking looks wrong, the prioritisation table is what to fix.
- **A deleted row is struck through, not removed.** Its id stays spent forever so old citations remain findable — but a retired row is no longer data and does not count.

### Binary and text documents

One converter handles the six Office formats plus the intake formats: plain text, CSV/TSV, JSON, `.eml`, and WebVTT/SRT transcripts (stripped to speech — roughly half a transcript is timing metadata).

```
uv run --script --frozen scripts/convert_to_md.py <input> --out ./tmp_conversion.md
uv run --script --frozen scripts/convert_to_md.py <input.xlsx> --formulas --out ./tmp_formulas.md
```

**Audio and images are refused**, with an explanation rather than a confusing failure — the harness has no transcription or vision service. Produce a text version and drop it in the same evidence folder, where it keeps the standing of the original.

Write into the engagement folder, read, then delete. Never target `datasources/`. CSVs over ~256 KB exceed a single `Read` — use offset+limit ranges.

### Declining well

**Identifying something that should not be built is a deliverable, not a failure.** The allocation grid's *leave alone* category is expected to be used, and the ranked matrix delivered to the client must include the workflows we recommend against automating. The bootcamp certifies this behaviour explicitly: "correctly identified at least one thing that should not be built."

### Nothing is temporary

**Every hack goes into production and stays there.** At ship time every artefact gets an explicit **fold-in or discard-by-named-date** call, recorded in `07-Production/fold-in-or-discard.md`. "Temporary" is not a state — it is a story we tell ourselves on the way to supporting something for a decade.

### Autonomy

**No system moves up a rung without meeting that rung's exit criterion.** A demo is not a measurement, a stakeholder's confidence is not a measurement, and elapsed time is not a measurement.

## Parallel execution

**Batch independent tool calls in one message.** The 4-step pattern: **gather** all independent reads → **think** with no tool calls → **execute** all independent writes → **verify** together.

**Caveat — the judgment chain is a dependency graph.** Requirements need evidence ids; allocations need map steps; ontology objects need requirements; eval cases need competency questions. Batch *within* a layer, never across.

## `state.json`

`engagements/<slug>/state.json` is the harness's index and the only thing the dashboard reads.

- **It is derived, never authoritative.** Every value counts things that exist as files. If it and the files disagree, **the files are right — regenerate.**
- **Never hand-edit it to make the dashboard look better.** A red gate is the harness working.
- **Machine-derivable status only.** A gate may be computed to `ready`; only a person sets `passed` with a `decidedBy`. Code never sets `passed`.
- Regenerate with `/dashboard`. Schema: `.claude/skills/skills-function/render-dashboard/state-schema.md`.

## Stage gates

Three gates, from the bootcamp's Week 1, Week 2 and capstone bars, placed at the runbook's stage boundaries. Each is a **stop**, not a status update. `engagement-manager` produces the memo; **the operator decides.**

| Gate | Between | Cannot pass without |
|---|---|---|
| **G1 — Discovery** | `03` → `04` | Operating map + exception inventory at standard · stakeholder map with the five roles and defensible decision rights · readiness scorecard with the data landmines named · draft ontology with the canonical grain chosen **and defended** · evidence-handling terms signed |
| **G2 — Build** | `06` → `07` | **The system works** — meets the acceptance threshold on a held-out slice with **zero silent failures**; everything below confidence routes to a gate · **the evidence exists** — eval report with a failure taxonomy, audit trail demonstrable on any run, regression gate blocks a deliberately broken change · **the judgment is defensible** — allocation grid survives challenge, the declines are argued convincingly, the cost envelope is arithmetic rather than hope |
| **G3 — Production** | `08` → `09` | **The judgment chain holds** · **library contribution accepted by the library owner** — those two are the capstone bar. Then shadow mode passed with divergence understood · UAT complete · client review held · a **measured** outcome, not a projected one · fold-in-or-discard on every artefact · a named production owner. Plus the five certified behaviours |

## Engagement structure

`/init-engagement` scaffolds this. Idempotent — fills gaps, never overwrites.

```
engagements/{slug}/
├── state.json
├── 00-Setup/
│   ├── pilot-charter.md              # scope, non-goals, acceptance criteria
│   ├── engagement-mandate.md         # what was sold, and to whom
│   ├── entry-hypotheses.md           # what we believe before we land, and what would disprove it
│   ├── agreement/                    # the commercial paper. NOT evidence, never classified
│   ├── evidence-handling-terms.md    # the six terms; signed BEFORE capture
│   └── stack-decision.md
├── 01-Organisation/
│   ├── stakeholder-map.md            # the five roles + decision rights
│   └── sponsor-brief.md              # the sponsor's success sentence, verbatim
├── 02-Workflow/
│   ├── observation-log.md            # EV- rows, one per observed action
│   ├── operating-map.md              # the discovery deliverable, 9 elements
│   ├── exception-register.md         # EX- rows; feeds shapes and golden sets
│   ├── requirements-register.md      # REQ- rows, each carrying a Source:
│   ├── open-questions.md             # Q- rows
│   ├── evidence/                     # raw material; the folder sets the class
│   │   ├── observed/                 #   an FDE watched it
│   │   ├── system/                   #   a log, export or record
│   │   ├── documented/               #   an SOP, policy or spec
│   │   └── stated/                   #   an interview, call or transcript
│   └── proposals/                    # extracted rows awaiting accept/reject
├── 03-Systems/
│   ├── systems-inventory.md
│   ├── readiness-scorecard.md        # availability, access, quality, landmines
│   ├── vocabulary-audit.md
│   └── ontology/
│       ├── glossary.md               # approved terms, grain, owners
│       ├── personas.md               # roles + permission matrix
│       ├── competency-questions.md   # CQ- rows — the model's acceptance test
│       ├── source-systems.md         # field mappings + identity rules
│       ├── entities.md
│       ├── backlog.md
│       └── promotion-log.md          # what reached the ontology repo, and why
├── 04-Placement/
│   ├── allocation-grid.md            # AL- rows: every step, one of four, with a reason
│   ├── prioritisation.md             # 2 axes; includes the declines
│   ├── value-hypothesis.md           # baselines captured while still observable
│   └── cost-envelope.md              # arithmetic, not hope
├── 05-Build/
│   ├── architecture.md
│   ├── architecture-diagram.md       # canonical Mermaid source
│   ├── access-model.md
│   ├── build-plan-{date}.md
│   ├── manual-tasks.md
│   └── builds/
├── 06-Evals/
│   ├── golden-sets/
│   ├── runs/{date}-{suite}.md
│   └── eval-report.md                # the client-facing artefact
├── 07-Production/
│   ├── autonomy-ledger.md            # rung, exit criterion, measurement
│   ├── adoption.md
│   ├── runbook.md
│   └── fold-in-or-discard.md         # every artefact, named date
├── 08-ROI/
│   ├── roi-model.md                  # 9 inputs, 4 outputs
│   └── executive-readout.md
├── 09-Loop/
│   ├── retrospective.md
│   └── library-contribution.md       # what we generalised, and where it landed
├── skills-engagement/                # client-calibrated; supersedes practice skills
├── chronicle/
│   ├── CHRONICLE.md
│   ├── memory/{MEMORY,engagement-overview,client-vocabulary,decisions,environment}.md
│   ├── sessions/YYYY-MM-DD-NNN.md
│   └── run-events/                   # machine-readable per-agent-run events
├── harness-improver/{feedback,improvements}/
└── engagement-management/
    ├── roadmap.md
    ├── raid-log.md
    ├── scope-changes.md
    └── stage-gate-{N}-readiness.md
```

Client-facing outputs land in `deliverables/{slug}/`, mirroring the stage folders. **Nothing is a deliverable until it has been rendered there.**

One exception exists before G1: `/sketch` writes `deliverables/{slug}/sketch/<date>.html` — the alignment sketch, built from accepted rows only, every line badged with its evidence class, under a `PROVISIONAL — pre-G1 alignment sketch` banner that is not removable by argument. It shows what was heard, never what will be built; it never reads a pending proposal and never invents a step. `state.json` lists it under `sketches[]`, apart from `deliverables[]`.

### Canonical paths — read the path, do not probe

A clean "not found" is itself the state signal.

| What | Path under `engagements/<slug>/` |
|---|---|
| Machine state | `state.json` |
| Charter · evidence terms | `00-Setup/pilot-charter.md` · `00-Setup/evidence-handling-terms.md` |
| What was agreed · what we assumed | `00-Setup/engagement-mandate.md` · `00-Setup/entry-hypotheses.md` |
| Stakeholder map | `01-Organisation/stakeholder-map.md` |
| Observation log · operating map | `02-Workflow/observation-log.md` · `02-Workflow/operating-map.md` |
| Exceptions · requirements · questions | `02-Workflow/exception-register.md` · `02-Workflow/requirements-register.md` · `02-Workflow/open-questions.md` |
| Raw material in · proposed rows out | `02-Workflow/evidence/{observed,system,documented,stated}/` · `02-Workflow/proposals/` |
| Systems · readiness · vocabulary | `03-Systems/systems-inventory.md` · `03-Systems/readiness-scorecard.md` · `03-Systems/vocabulary-audit.md` |
| Ontology contract | `03-Systems/ontology/glossary.md` · `personas.md` · `competency-questions.md` · `source-systems.md` · `entities.md` |
| What that contract promises | `docs/contract.md` — **read before editing any ontology template** |
| Promotion log | `03-Systems/ontology/promotion-log.md` |
| Allocation grid · prioritisation | `04-Placement/allocation-grid.md` · `04-Placement/prioritisation.md` |
| Value · cost | `04-Placement/value-hypothesis.md` · `04-Placement/cost-envelope.md` |
| Architecture · access model | `05-Build/architecture.md` · `05-Build/access-model.md` |
| Eval report · autonomy ledger | `06-Evals/eval-report.md` · `07-Production/autonomy-ledger.md` |
| Fold-in call | `07-Production/fold-in-or-discard.md` |
| ROI model | `08-ROI/roi-model.md` |
| Library contribution | `09-Loop/library-contribution.md` |
| Gate readiness | `engagement-management/stage-gate-<N>-readiness.md` |
| Memory index · per-role feedback | `chronicle/memory/MEMORY.md` · `harness-improver/feedback/<role>.md` |

### Ownership

- `chronicle/memory/` is **prose only** — no code, JSON or scripts. Those live in `05-Build/builds/`.
- `chronicle/run-events/` is machine-written, append-only. It is what lets state derivation work without an interactive session.
- `decisions.md` — `solution-architect` is the canonical writer; others route through it.
- `state.json` — regenerated by `/dashboard`; never hand-edited.

## The improvement loop

`/chronicle` at session end writes the log and per-role feedback. `/harness-improver` consolidates into proposals.

**Hard rule:** `harness-improver` may edit skills, templates and `CLAUDE.md`, but **never anything under `.claude/agents/` — even with operator approval.** Agent prompts are the harness's contract. Proposed prompt edits are preserved verbatim in `harness-improver/feedback/<role>.md` for a deliberate, separate human promotion.

**Nothing enters the library without a named engagement that needed it.** Every skill and template here should trace to a moment an FDE was slowed down or a client asked something we could not answer.
