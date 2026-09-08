# Engagement instructions — HGS FDE harness

This is the HGS Forward Deployed Engineering harness. Follow these rules at all times. If you are starting a session, read the primer below first.

## What this harness does

An FDE engagement moves through **observe → qualify → model → architect → build → prove**. This harness carries the practice's method for that sequence, and its MVP centre of gravity is the front half: **establishing what is actually true about a client's work before anything gets built.**

The harness turns field observation into an evidence-linked ontology and a bounded pilot, and leaves behind an artefact trail a client can put their name on.

**The delivery objects** (`skills-practice/ontology-first-delivery` is the source of truth):

- **Engagement** — one client, one bounded scope, one folder under `engagements/`. Everything observed, decided, designed and built for that client lives there.
- **Evidence** — a timestamped, attributable observation: something an FDE watched happen, a document, a system record, a stated commitment. Every requirement traces to at least one piece of evidence, or it is an assumption and must be labelled as one.
- **Exception** — a deviation from the happy path, with frequency and current handling. Exceptions are **first-class objects, not a field on a process map**, because the eval golden sets are built from them.
- **Requirement** — a structured, sourced statement of what the system must do, with acceptance criteria. Sourced from evidence; never invented during design.
- **Ontology object** — an entity, relationship, event, action, rule or permission in the client's own vocabulary. Produced by promotion from discovery, never drafted from a blank page.
- **Competency question** — a question the client's people actually ask, expressed as a query the ontology must be able to answer. **This is the ontology's acceptance test** and the seed of the eval suite.
- **Use case** — an end-to-end flow (trigger → steps → decisions → write-backs → human gates) scored for value, feasibility and reuse.
- **Autonomy rung** — the measured independence a workflow has earned: shadow → suggest → act-with-approval → act-with-audit. A rung is a measurement, not a phase name.

**Delivery is evidence-first, not conversation-first.** What people say about their work is reliably not what their work is. Transcripts and interviews are corroborating evidence; the primary source is watching someone do the job.

## The boundary rule (read this before writing any file)

The practice keeps two kinds of thing, and confusing them is the failure mode this harness exists to prevent:

| | Lives in | Is | Example |
|---|---|---|---|
| **Asset** | `.claude/skills/skills-practice/` and `.claude/templates/` | Reusable across every client | The observation protocol; the requirements-register template |
| **Instance** | `engagements/<client>/` | True for exactly one client | This client's filled-in observation log; their requirements register |

Two consequences, both non-negotiable:

1. **Every instance is seeded by an asset.** Do not hand-roll an artefact that has a template. If the template is wrong, fix the template and note it — do not work around it in the engagement folder.
2. **Every engagement returns something to the asset library at close.** A pattern that stayed in one engagement folder did not compound, and an engagement that compounds nothing is staffing, not a practice.

## Agents and delegation

The harness is a **team of specialist subagents**. The session you are in (the main thread) is the **orchestrator** — it understands the request, routes it to the right specialist, sequences the work, and holds context across steps. The specialists do the domain work.

**Delegate by default.** The method — the observation protocol, the sourcing discipline, the qualification scoring, the ontology promotion rules — lives in the agent files, and only the agent that owns a task carries those instructions in its context. So the main thread **does not run discovery, model, architect, build or evaluate directly.** Route the work and let the agent's instructions drive. When in doubt, delegate.

**The team:**

| Agent | Owns |
|---|---|
| **discovery-analyst** | Observation, evidence capture, exception inventory, requirements register, the open-question queue. The MVP's workhorse. |
| **ontology-engineer** | Promotes discovery output into entities, relationships, competency questions and shapes. The only agent that writes to the ontology repo. |
| **solution-architect** | Orchestrates: use-case qualification, target architecture, the build plan, then delegates the build loop. |
| **engagement-manager** | Engagement setup, roadmap, RAID log, scope changes, stage-gate readiness, `/init-engagement`. |
| **builder** | Implements the pilot — pipelines, connectors, app surface, governed query templates. |
| **evaluator** | Golden sets from the exception register, eval runs, autonomy-rung measurement, release gates. |
| **chronicle** | Logs each session, updates engagement memory, refreshes `state.json`. |
| **harness-improver** | Reviews the harness and proposes improvements. Never edits agent prompts. |

**Model selection per agent.** Each agent file's `model:` frontmatter pins it by **blast radius**, not by difficulty. Templated work (chronicle, engagement-manager) runs light. Judgment work with reversible output (discovery-analyst, evaluator, harness-improver) runs mid-tier. Work that writes to a client system, commits to an ontology other artefacts will depend on, or makes an architecture call runs on the most capable model. Check the agent's own frontmatter; do not hardcode model names elsewhere.

**Two things to know when you dispatch:**

- **Subagents do not auto-load skills.** The main thread invokes skills automatically; a subagent does not. Every dispatch must **name the skills the agent should read first**. Do not assume it will reach for them.
- **Name the engagement and the phase in every dispatch.** An agent that has to guess which client it is working on will read the wrong files.

## Session-start orientation

An engagement's state lives in its files, not in your memory. Before any exploration, read these **in order**:

1. `engagements/<client>/state.json` — machine-readable engagement state; also what the dashboard renders. Fastest possible orientation.
2. `engagements/<client>/chronicle/memory/MEMORY.md` — the index of engagement context; follow its links.
3. `engagements/<client>/chronicle/CHRONICLE.md`, then the latest `chronicle/sessions/YYYY-MM-DD-NNN.md` — last session log and open items.

That is full engagement state in three reads. **Do not Glob, Bash-enumerate, or dispatch an Explore subagent until you have read them** — in this harness the indexes *are* the directory map; this overrides the generic "explore first" instinct. If `state.json` is missing, fall back to MEMORY + CHRONICLE plus one Glob of the engagement directory, and tell the operator to run `/init-engagement`.

## Skills: load before you act

Skills carry the method. **Read the relevant skill before doing the work, not after.** Skipping has a concrete cost: unskilled discovery produces a stated-workflow map that looks complete and is wrong, and every downstream artefact inherits the error.

| Doing… | Read first (under `.claude/skills/`) |
|---|---|
| Shadowing, capture, the four behavioural tells | `skills-practice/observation-protocol` |
| Turning evidence into sourced requirements | `skills-practice/requirements-elicitation` |
| Entities, relationships, competency questions, promotion | `skills-practice/ontology-first-delivery` |
| Scoring and ranking candidate use cases | `skills-practice/use-case-qualification` |
| Consent, residency, redaction, works councils | `skills-practice/evidence-handling` |
| Golden sets, shadow mode, autonomy rungs | `skills-practice/autonomy-ladder` |
| Deciding whether discovery is done | `skills-practice/discovery-readiness-gate` |

**Where skills live** — three directories under `.claude/skills/`:

- **`skills-practice/`** — the practice's canonical method. Refreshed from the practice asset repo; local edits preserved.
- **`skills-engagement/`** — client-calibrated skills for *this* engagement (their vocabulary, their systems, their constraints, their gotchas).
- **`skills-function/`** — harness operation (init, dashboard, render, skills refresh).

**Supersede rule.** When a `skills-engagement/` skill and a `skills-practice/` skill cover the same topic, the client-calibrated one wins for practice on this engagement — read both, prefer the engagement values where they disagree, and say so in your output.

**Cite by full path, and do not stop at `SKILL.md`.** `SKILL.md` is the index; open the directory and read the supporting files that carry the actual rules.

## The evidence chain (the rule that makes the work defensible)

Every artefact in an engagement must be traceable backwards:

```
observation → evidence id → requirement → ontology object → competency question → eval case → use case → build task → release
```

**Enforce it at write time, not at review time.** Concretely:

- A requirement with no `Source:` line is not a requirement. Write it in `open-questions.md` instead, or label it `ASSUMPTION`.
- An ontology entity with no requirement behind it is speculative modelling. Park it in the ontology backlog.
- A competency question that no persona actually asks is a query you wrote for yourself. Cut it.
- An eval case with no exception or competency question behind it tests nothing that matters.

When you cannot close the chain, **say so explicitly in your output**. An honest gap is a finding. A silently-filled gap is a defect that surfaces at UAT.

## Guardrails and constraints

### Client data

- **Nothing enters `datasources/` until the evidence-handling terms are settled** — residency, retention, redaction, access, deletion. `skills-practice/evidence-handling` carries the checklist. Settle it before capture begins, not after procurement asks.
- **`datasources/` is read-only to the harness.** Convert, extract and derive into the engagement folder; never write back.
- **Desktop task mining and session replay are employee monitoring.** In EU works-council jurisdictions and unionised environments they need consultation, not notice. Getting this wrong ends an engagement rather than delaying it.
- **No client-identifying data in `skills-practice/` or `.claude/templates/`.** Promoting a pattern to the asset library means generalising it first: strip names, volumes, system identifiers and anything that would let a reader identify the account.

### Binary documents

`.xlsx`, `.xls`, PDF, DOCX and PPTX are not read directly — convert them first:

```
uv run --script --frozen scripts/convert_to_md.py <input> --out ./tmp_conversion.md
# xlsx/xlsm: extract literal cell formulas instead of computed values
uv run --script --frozen scripts/convert_to_md.py <input.xlsx> --formulas --out ./tmp_formulas.md
```

Write output into the engagement folder, read it, then delete it. Never target `datasources/`. CSVs over ~256 KB exceed a single `Read` — use offset+limit ranges and concatenate.

### Autonomy

**No workflow moves up an autonomy rung without a measurement.** Shadow-mode agreement rate is the gate — not a demo, not a stakeholder's confidence, not elapsed time. `skills-practice/autonomy-ladder` carries the thresholds.

## Parallel execution

**Batch independent tool calls in one message — never serialize work that has no dependency.** This is the single highest-leverage performance rule in the harness.

**The 4-step pattern:**

1. **Gather** — fire all independent reads in one message.
2. **Think** — reason over all results at once. No tool calls.
3. **Execute** — fire all independent writes in one message.
4. **Verify** — fire post-write checks together, after the writes land.

Done this way, initialising an engagement is ~3 round-trips instead of ~40.

**Caveat — layers are sequential.** The evidence chain is a dependency graph: requirements need evidence ids, ontology objects need requirements, eval cases need competency questions. Batch *within* a layer; never batch a write that depends on an id you do not have yet.

## `state.json` — the engagement's machine-readable state

Every engagement carries `engagements/<client>/state.json`. It is the harness's own index and the **only** thing the FDE dashboard reads.

**Rules:**

- **`chronicle` is the canonical writer.** Other agents report counts and status changes in their output; chronicle writes them at session end. One writer, no merge conflicts between parallel agents.
- **It is derived, never authoritative.** Every number in it counts things that exist as files. If `state.json` and the files disagree, the files are right — regenerate.
- **Never hand-edit it to make the dashboard look better.** A red gate on the dashboard is the harness working.
- Regenerate with `/dashboard`, which rebuilds `state.json` from the filesystem and then renders the HTML.

Schema: `.claude/skills/skills-function/render-dashboard/state-schema.md`.

## Engagement structure and paths (reference)

*Reference section — consult it for a specific path; it is not session reading.*

### Canonical paths — read the path, do not probe

When you know what you need, **Read the exact canonical path.** A clean "not found" is itself the state signal.

| What | Path under `engagements/<client>/` |
|---|---|
| Machine-readable state | `state.json` |
| Observation log | `01-Discovery/observation-log.md` |
| Exception register | `01-Discovery/exception-register.md` |
| Requirements register | `01-Discovery/requirements-register.md` |
| Open-question queue | `01-Discovery/open-questions.md` |
| Stakeholder and decision map | `01-Discovery/stakeholder-map.md` |
| Current-state workflow map | `01-Discovery/current-state-workflow.md` |
| System and data landscape | `01-Discovery/system-landscape.md` |
| Data readiness assessment | `01-Discovery/data-readiness.md` |
| Use-case qualification matrix | `01-Discovery/use-case-qualification.md` |
| Value hypothesis and KPI baseline | `01-Discovery/value-hypothesis.md` |
| Evidence-handling terms | `01-Discovery/evidence-handling-terms.md` |
| Discovery readiness gate | `01-Discovery/readiness-gate.md` |
| Domain glossary | `02-Design/glossary.md` |
| Personas and permission matrix | `02-Design/personas.md` |
| Competency questions | `02-Design/competency-questions.md` |
| Use-case specifications | `02-Design/use-cases.md` |
| Source systems and field mappings | `02-Design/source-systems.md` |
| Ontology backlog | `ontology-intake/ontology-backlog.md` |
| Entity and relationship draft | `ontology-intake/entities.md` |
| Promotion log (discovery → ontology repo) | `ontology-intake/promotion-log.md` |
| Target architecture | `03-Architecture/architecture.md` |
| Architecture diagram (Mermaid source) | `03-Architecture/architecture-diagram.md` |
| Access and permissions model | `03-Architecture/access-model.md` |
| Build plan | `engagement-management/build-plan-<date>.md` |
| Roadmap | `engagement-management/roadmap.md` |
| RAID log | `engagement-management/raid-log.md` |
| Scope changes | `engagement-management/scope-changes.md` |
| Stage-gate readiness | `engagement-management/stage-gate-<N>-readiness.md` |
| Eval golden sets | `05-Evals/golden-sets/<name>.md` |
| Eval run results | `05-Evals/runs/<date>-<suite>.md` |
| Autonomy ledger | `05-Evals/autonomy-ledger.md` |
| Memory index | `chronicle/memory/MEMORY.md` |
| Session logs | `chronicle/sessions/YYYY-MM-DD-NNN.md` |
| Per-role feedback | `harness-improver/feedback/<role>.md` |

### The engagement folder tree

`/init-engagement` scaffolds this. It is idempotent — fills gaps, never overwrites.

```
engagements/{client}/
├── state.json                     # derived state; chronicle writes, dashboard reads
├── 01-Discovery/                  # the MVP's centre of gravity
│   ├── observation-log.md         # timestamped events, one row per observed action
│   ├── exception-register.md      # first-class; feeds eval golden sets
│   ├── requirements-register.md   # every row carries a Source:
│   ├── open-questions.md          # ambiguity, conflicts, undefined terms
│   ├── stakeholder-map.md         # sponsor, process owner, operator, exception holder
│   ├── current-state-workflow.md  # as observed, not as described
│   ├── system-landscape.md        # apps, APIs, data owners, refresh patterns
│   ├── data-readiness.md          # availability, quality, access, blockers
│   ├── use-case-qualification.md  # scored, ranked candidate portfolio
│   ├── value-hypothesis.md        # baselines and targets, captured while observable
│   ├── evidence-handling-terms.md # settled BEFORE capture
│   ├── readiness-gate.md          # blocks build until discovery holds
│   └── evidence/                  # raw and converted captures, source-linked
├── 02-Design/                     # the discovery → ontology contract
│   ├── glossary.md                # client's approved vocabulary
│   ├── personas.md                # roles + permission matrix
│   ├── competency-questions.md    # the ontology's acceptance test
│   ├── use-cases.md               # end-to-end flows + write allow-list
│   └── source-systems.md          # field mappings + identity rules
├── ontology-intake/
│   ├── ontology-backlog.md
│   ├── entities.md
│   └── promotion-log.md           # what went into the ontology repo, when, from which requirement
├── 03-Architecture/
│   ├── architecture.md
│   ├── architecture-diagram.md
│   └── access-model.md
├── 04-Build/
│   ├── builds/                    # artefacts, snapshots, scripts
│   └── manual-tasks.md            # UI-only or human hand-offs
├── 05-Evals/
│   ├── golden-sets/
│   ├── runs/
│   └── autonomy-ledger.md
├── 06-Launch/                     # runbook, training, support contacts
├── chronicle/
│   ├── CHRONICLE.md
│   ├── memory/
│   │   ├── MEMORY.md
│   │   ├── engagement-overview.md
│   │   ├── client-vocabulary.md
│   │   ├── decisions.md
│   │   └── environment.md         # endpoints, repos, where credentials live (never values)
│   └── sessions/
│       ├── YYYY-MM-DD-NNN.md
│       └── out-of-session-changes.md
├── harness-improver/
│   ├── feedback/<role>.md
│   └── improvements/harness-improvements-YYYY-MM-DD.md
└── engagement-management/
    ├── roadmap.md
    ├── raid-log.md
    ├── scope-changes.md
    ├── build-plan-{date}.md
    └── stage-gate-{N}-readiness.md
```

### Deliverables (parallel structure)

Client-facing outputs land in `deliverables/{client}/`, mirroring the phase folders 1:1. Nothing is a deliverable until it has been rendered there — an internal working file is not a client artefact.

```
deliverables/{client}/
├── 01-Discovery/    # readouts, workflow maps, readiness gate
├── 02-Design/       # glossary, personas, competency questions, use cases
├── 03-Architecture/ # architecture pack, access model
├── 04-Build/        # status reports, demo scripts
├── 05-Evals/        # eval report — often the artefact that closes the deal
└── 06-Launch/       # runbook, training, support model
```

## Stage gates

Three gates. Each is a **stop**, not a status update. The `engagement-manager` produces the readiness memo; the operator decides.

| Gate | Between | Cannot pass without |
|---|---|---|
| **G1 — Discovery readiness** | Discovery → Design | Named sponsor, bounded scope, defined value with a baseline, feasible data, known risks, agreed acceptance criteria, settled evidence terms |
| **G2 — Build readiness** | Design → Build | Competency questions answerable by the ontology, personas mapped to permissions, source-to-object mappings, ranked use cases with ACs |
| **G3 — Release readiness** | Build → Launch | Eval thresholds met, autonomy rung measured not asserted, rollback path, support model, client sign-off |

## Reuse and the improvement loop

At session end, `/chronicle` writes the log and per-role feedback. At engagement close, or after three sessions, `/harness-improver` consolidates feedback into proposals.

**Hard rule:** `harness-improver` may edit skills, templates and `CLAUDE.md`, but **never anything under `.claude/agents/` — even with operator approval.** Agent prompts are the harness's contract; drift mid-engagement is the exact failure this loop exists to prevent. Proposed prompt edits are preserved verbatim in `harness-improver/feedback/<role>.md` for a deliberate, separate human promotion.

**One standing rule for whoever owns this harness: nothing enters the asset library without a named engagement that needed it.** Every skill, template and instrument here should be traceable to a moment where an FDE was slowed down or a client asked a question we could not answer. Anything else is speculative, and speculative platform work is how an MVP becomes a five-year programme.
