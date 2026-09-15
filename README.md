# HGS FDE harness

A Claude Code project harness implementing the HGS Forward Deployed Engineering practice method — the ten stages of the engagement runbook, with the artefacts that pass the bootcamp's gates. Both documents are vendored in [`docs/canon/`](docs/canon/).

**Where things stand:** [`docs/status.md`](docs/status.md) — what is ready, what is manual, what is missing, and what to do next.

**The canon is canon.** The runbook owns the stages and the frameworks; the bootcamp owns the gates and the certified behaviours; the tooling map is what the tooling is measured against. Where the harness and a canon document disagree, the document wins and the divergence is a defect to report. See [`docs/conformance.md`](docs/conformance.md) for what is implemented, what is extension, and what is knowingly divergent.

---

## Why this exists

**The gap.** Our FDEs are good at discovery — sitting with the client, mapping how the business actually works, capturing what people call things and what they ask every day. Right now that knowledge dies in documents. There is no clean path from *"we understand your business"* to *"your AI systems understand your business."*

That path is an **ontology**: the client's business, written down in a form software can use. Building one by hand, from scratch, every engagement, is the gap.

**The plan, in three pieces.**

**1. `fde-harness` captures discovery in a structured way.** Instead of loose notes and decks, discovery lands in six standard files: the client's vocabulary, who does what, the questions their people actually ask, what the AI is allowed to write, where the data lives, and the rules for what "clean" data looks like. **Every line traces back to evidence** — something we saw or someone said. No guessing.

**2. The `ontology-engineer` promotes those six files into a real model.** Deliberate, logged, human-approved. This is the quality gate: nothing enters the model that discovery did not earn.

**3. The ontology compiler turns that model into a working system** on whatever platform the client already runs. Same six files in; out comes a Databricks build or a Fabric build. **We do not pick the platform** — the client's estate and their questions pick it.

### Where each piece actually stands

Being precise about this matters more than the pitch, because an FDE picking this up needs to know which parts will carry weight today.

| Piece | State |
|---|---|
| **1 — capture** | **Built and in use.** Ten stages, 50 instrument templates, the evidence chain enforced in code, an intake loop that turns raw material into proposed rows, and a coach that tells you what to ask next |
| **2 — promote** | **Built as a discipline, not yet as automation.** `ontology-engineer` is the only agent permitted to write to an ontology repo, and every write is logged in `promotion-log.md` against the requirement that justified it. What is still manual is the modelling itself — a person reads the contract and builds the graph |
| **3 — compile** | **Built.** [`jpsusarreyHGS/ontology-compiler`](https://github.com/jpsusarreyHGS/ontology-compiler) reads an engagement's contract layer directly and emits a governed assistant. **Jena** and **Databricks** are stable; **Fabric** is configured in the instance file but not implemented — its own README says the first task there is research, not code |

### The contract layer

The handoff between discovery and the build. Every file is a **discovery deliverable filled from the field**, not a modelling artefact invented at a desk — that is the load-bearing idea in the whole method, and the reason the compiler can read it at all.

All of it lives in `engagements/<slug>/03-Systems/ontology/`, except the flows, which stay where they are written.

| In plain terms | File | Filled from | Required |
|---|---|---|---|
| The client's vocabulary | `glossary.md` | Terms captured verbatim during observation | **yes** |
| Who does what, and what they may change | `personas.md` | `01-Organisation/stakeholder-map.md` | **yes** |
| The questions their people actually ask | `competency-questions.md` | `02-Workflow/open-questions.md` and observed asks | **yes** |
| Where the data lives, and what mints each id | `source-systems.md` | `03-Systems/systems-inventory.md` | **yes** |
| The objects, and what "clean" looks like | `entities.md` | `02-Workflow/exception-register.md` | no |
| What the AI is allowed to do, end to end | `05-Build/spec.md` | `04-Placement/prioritisation.md` | no |
| What is waiting, and what was promoted | `backlog.md` · `promotion-log.md` | The promotion decisions themselves | no |

**`CQ-` and `WR-` ids are the join key.** A competency question numbered `CQ-01` here becomes `cq-01-<slug>` as a read template, a filename, a registry id and a coverage row in every target. Changing an id changes a filename in another repository — which is why code mints them and nobody types one.

**Competency questions are the acceptance test.** A question the model cannot answer is either a modelling gap or a data gap — and which one it is must be stated, because they have completely different remedies and completely different costs.

---

## The ten stages

| | Stage | Command |
|---|---|---|
| `00` | Before you land | `/init-engagement` |
| `01` | Map the organisation | `/capture` · `/discover` |
| `02` | Gather the real workflow | `/capture` · `/discover` |
| `03` | Analyse the systems | `/capture` · `/discover` · `/ontology` |
| | **G1 — Discovery gate** | `/gate 1` |
| `04` | Place the intelligence | `/allocate` |
| `05` | Build the MVP | `/architect` · `/build` |
| `06` | Prove it with evals | `/evaluate` |
| | **G2 — Build gate** | `/gate 2` |
| `07` | Ship into production | `/evaluate` |
| `08` | Calculate the ROI | `/roi` |
| | **G3 — Production gate** | `/gate 3` |
| `09` | Run the loop again | `/harness-improver close` |

Plus `/next` (the three conversations to have tomorrow, with names attached), `/dashboard` (rebuild state and render the GUI), `/render` (client deliverables) and `/chronicle` (log the session).

## What it gives you

| | |
|---|---|
| **8 specialist agents** | discovery-analyst, ontology-engineer, solution-architect, engagement-manager, builder, evaluator, chronicle, harness-improver |
| **15 slash commands** | the stage pipeline plus dashboard, render and the improvement loop |
| **9 practice skills** | observation protocol, requirements elicitation, allocation grid, ontology-first delivery, evidence handling, the four tests, the autonomy ladder, stage gates, ROI and readout |
| **50 templates** | every stage instrument, with machine-readable table anchors |
| **A published contract** | `03-Systems/ontology/` compiles to a governed assistant — see [`docs/contract.md`](docs/contract.md) |
| **A dashboard** | portfolio and per-engagement views, derived from `state.json` |

## The frameworks it implements

Straight from the runbook, not invented — the gates below come from the bootcamp instead, and [`docs/conformance.md`](docs/conformance.md) keeps the two apart:

- **The operating map** — nine elements, including *dead ends* and *failure modes*
- **The five roles** — sponsor, process owner, operator, **exception holder**, systems gatekeeper
- **The four tells** — repeated task, copy-paste between systems, tool switching, dead time
- **The allocation grid** — every step assigned to deterministic / model judgement / human gate / **leave alone**, with a written reason
- **Prioritisation on two axes** — value at stake and feasibility
- **The four tests** — right data, required steps, matches an expert, safe to act on
- **The autonomy ladder** — five rungs, each with an explicit exit criterion
- **The engagement ROI model** — nine inputs, four outputs

## Prerequisites

- **Node 24 or newer.** Everything under `packages/` runs TypeScript directly, with no build step — that is on by default from v24, and on v22 the documented commands fail with a syntax error that looks like a bug in the harness.
- [Claude Code](https://claude.com/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- [`uv`](https://docs.astral.sh/uv/) — for `scripts/convert_to_md.py` (PDF, Word, PowerPoint, Excel)
- `git`

## Using it — step by step

If you read nothing else, read this. **You produce raw material and have conversations. The harness produces structure and tells you what is missing.**

### Step 0 — Get set up (once)

```powershell
git clone https://github.com/jpsusarreyHGS/fde-harness.git
cd fde-harness
.\setup.ps1
```

```bash
git clone https://github.com/jpsusarreyHGS/fde-harness.git
cd fde-harness
./setup.sh
```

The script checks your Node version, installs dependencies, and stops with an explanation if something is missing. It should finish with no manual steps. Then:

```bash
claude
```

Everything below happens inside Claude Code, in this directory.

### Step 1 — Create the engagement

```
/init-engagement
```

You will be asked ten things in one go: client name, slug, sponsor, one-line scope, non-goals, target systems, ontology repo, data residency, and whether there is a works council or union.

**Say `TBD` when you do not know.** Do not guess a sponsor or a residency posture — one names who settles a dispute, the other decides whether you can legally start capturing. Every `TBD` becomes an open question with an owner and a note about what it blocks, so nothing quietly goes missing.

You get `engagements/<slug>/` with ten stage folders, 58 seeded instruments, a mirrored `deliverables/<slug>/`, and a `state.json` that honestly reports almost everything as empty. **That is correct.** An engagement that looks half-full on day one was seeded with fake numbers.

### Step 2 — Settle two things before you capture anything

Neither is optional, and the harness will stop you.

1. **Sign the evidence-handling terms** — `00-Setup/evidence-handling-terms.md`. Residency, retention, redaction, access, deletion, onward use. `discovery-analyst` hard-stops without them, because evidence captured under unresolved terms may have to be destroyed, and destroying discovery evidence means redoing discovery.
2. **Check the monitoring constraint.** Desktop task mining and session replay are employee monitoring. In works-council jurisdictions and unionised environments they need **consultation, not notice** — a process with a counterparty who can say no. Getting this wrong ends an engagement rather than delaying it.

### Step 3 — Go and watch. Come back with material.

This is the part only you can do, and the reason the rest exists: **eight hours beside the operator gets you the job.** Spend them watching, not typing.

Bring back whatever you actually produced — shift notes, a call transcript, an SOP, a system export, a photograph of a whiteboard — and drop each file into the folder that says what it is:

```
engagements/<slug>/02-Workflow/evidence/
├── observed/      you watched it happen        → primary evidence
├── system/        a log, export, record        → primary for volume and frequency
├── documented/    an SOP, policy, spec, deck   → aspirational until observed
└── stated/        an interview, call, meeting  → corroborating only
```

**The folder decides the class, never the content.** A confident-sounding transcript in `stated/` stays Stated evidence, and anything sourced only from it gets labelled `UNVERIFIED`. That discipline is the difference between a requirement that survives UAT and one that does not — so it is structural, not something you have to remember at the end of a long day.

A file dropped outside a class folder is **reported, never guessed at**.

PDFs, Word, PowerPoint and Excel need converting first:

```bash
uv run --script --frozen scripts/convert_to_md.py "<path>" --out ./tmp_conversion.md
```

For a spreadsheet, `--formulas` extracts the cell logic (`=B2*C2`) instead of the computed numbers — that is how you reverse-engineer a client's model rather than read its output:

```bash
uv run --script --frozen scripts/convert_to_md.py "<path>.xlsx" --formulas --out ./tmp_formulas.md
```

Write the conversion into the engagement folder, read it, delete it. A stray conversion is an unredacted copy of client material sitting outside its intended store.

Audio and images need a transcript or a description written first — the harness has no transcription service and will say so rather than fail confusingly.

### Step 4 — Turn it into structure

```
/capture
```

The agent reads what is waiting, extracts observations, exceptions, requirements, map elements and questions, and writes a **proposal** — an ordinary markdown file of rows for you to skim.

**Nothing reaches a register until you accept it.** Fix a cell, delete a row that is wrong, then:

```bash
node packages/derive/src/cli.ts pending engagements/<slug>
```

```bash
node packages/derive/src/cli.ts accept engagements/<slug> <proposal.md>
```

Decided against it? `reject` it with a reason, so the queue stops showing work nobody will do.

**Ids are blank on purpose.** Code mints `EV-`, `EX-`, `REQ-` and `Q-` at accept time, so the sequence stays contiguous even if another session wrote in between — and you never type or sequence one. An accept that cites an id which does not exist is refused whole, because a partial accept leaves the register in a state nobody chose.

### Step 5 — Ask what to ask

```
/next
```

This is the half that talks back. It reads the evidence chain and the open gate's criteria and gives you **the conversations to have tomorrow, grouped by who can answer them** — with names attached where the stakeholder map has them, what each question blocks, and where to write the answer down.

```
Ana Fuentes — Exception holder
  · EX-002: who actually decides this one? Not the team — the person you
    go to when it is not obvious.
      why: blocks the #1 workflow (claims triage); exception without rule holder
      write it to: 02-Workflow/exception-register.md
```

It is ranked by **what each question blocks** — joined to your prioritisation table — and by **how fast the answer perishes**. An operator's undocumented rule is elicitable while you are sitting beside them and effectively gone three weeks later; a broken citation costs minutes at a desk in November. Every line says why it ranks where it does. If the reason looks wrong, fix the prioritisation table rather than the order.

Things nobody at the client can answer come out separately, under *"yours to fix"*.

### Step 6 — Go back and ask. Then repeat.

Answers go **into the instrument, not into chat**. A question answered in conversation and not written down is a question you will ask twice. The easiest route is the loop you already know: bring back the notes, drop them in `evidence/`, and run `/capture` again.

```
watch → drop in evidence/<class>/ → /capture → accept → /next → ask → repeat
```

### Step 7 — See where you stand

```
/dashboard
```

Rebuilds `state.json` from what is actually on disk, then renders self-contained HTML. Opens by double-click; no server, no build step.

**A red gate or an empty instrument is the harness working.** Never hand-edit `state.json` to make it look better — it is derived, and if it disagrees with the files, the files are right.

### Step 8 — The gate, when discovery feels done

```
/gate 1
```

A gate is a **stop, not a status update**. The memo recommends READY / READY WITH CAVEATS / NOT READY, and **a person decides** — code never sets `passed`, and a state file claiming otherwise is refused as tampered. An all-green memo on first pass usually means it was written from intent rather than evidence.

Past G1, the pipeline continues: `/allocate` (place the intelligence), `/architect` and `/build`, `/evaluate`, `/gate 2`, `/roi`, `/gate 3` — and the contract layer goes to the compiler, below.

### Step 9 — Hand discovery to the build

Past G1, the contract layer is what the build is made from. Check it will be accepted before you hand it over:

```bash
node packages/derive/src/cli.ts contract-check engagements/<slug>
```

Four things stop a build downstream, and all four are questions for a person rather than defects in your typing: a glossary term nobody owns, a competency question nobody was observed asking, a write with no approver, an entity with no system that mints it. They appear in `/next` with a name attached, ranked above everything else — a refusal is not advice, it is a build that will not happen.

Everything merely thin is a warning and does not block. A question with no template yet is progress you can see.

When it passes, [`ontology-compiler`](https://github.com/jpsusarreyHGS/ontology-compiler) reads the folder directly:

```bash
python -m core.importer engagements/<slug>/03-Systems/ontology --instance <slug> --target databricks
```

See [`docs/contract.md`](docs/contract.md) for what that folder has promised, and read it before you change anything in it — a template edit there is an API change in another repository.

### Bringing an old engagement forward

Templates change. To backfill an existing engagement onto the current set without touching anything you have written:

```bash
node packages/derive/src/cli.ts scaffold engagements/<slug> --json vars.json --dry-run
```

Read what it would create, then drop the flag. Existing files are never overwritten.

### If you get stuck

| Symptom | What it means |
|---|---|
| A command fails with a TypeScript syntax error | You are on Node 22. This needs 24 — check with `node -v` |
| `/capture` says nothing is waiting | Your files are outside a class folder. Run `node packages/derive/src/cli.ts intake engagements/<slug>` and it will name them |
| The dashboard shows an instrument as empty that you filled | It has no table anchor, or you wrote outside the anchored table. Report it — that is a defect, not your mistake |
| An accept is refused | It cites an id that does not exist. The message names it |
| `/next` has nothing to say | Either nothing is genuinely blocked, or the gate memo has not been started |

Anything the harness gets wrong is worth logging: `/harness-improver`. **Nothing enters the shared library without a named engagement that needed it.**

## Two ideas worth understanding first

**The judgment chain.** Every artefact traces to evidence:

```
map → grid → spec → build → eval → claim
```

Enforced at write time, not review time. A requirement with no source is not a requirement; an allocation with no written reason is not an allocation; a claim with no eval behind it is a hope. **Any broken link is a named defect.**

**The boundary rule.** `.claude/skills/skills-practice/` and `.claude/templates/` hold **assets**, reusable across every client. `engagements/<slug>/` holds **instances**, true for exactly one client. Every instance is seeded by an asset, and **every engagement returns something to the library at close** — the bootcamp makes that a certification requirement. An engagement that compounds nothing is staffing, not a practice.

## Folders

| | |
|---|---|
| `engagements/` | Working files per engagement, in ten stage folders |
| `deliverables/` | Client-facing outputs, mirrored per stage |
| `datasources/` | Client input files. **Read-only to the harness** |
| `.claude/skills/skills-practice/` | The practice method — reusable |
| `.claude/templates/` | Instrument templates. Every engagement artefact is seeded from here |

Client-calibrated skills live at `engagements/<slug>/skills-engagement/` and **supersede** practice skills for that engagement.

## The dashboard

```
/dashboard
```

Two phases: **derive** `state.json` by counting what exists on disk, then **render** self-contained HTML. Opens by double-click — no server, no build step.

`state.json` is derived, never authoritative. If it disagrees with the files, the files are right. **Never hand-edit it to make the dashboard look better** — a red gate is the harness working. Gates derive only as far as `ready`; **only a person sets `passed`**, with their name.

Derivation is driven by table anchors (`<!-- table:<instrument>.<table> role=register id=Id -->`), so headings can be reworded without breaking the parse. Schema: `.claude/skills/skills-function/render-dashboard/state-schema.md`.

## Ontology pipeline

`03-Systems/ontology/` is not a working folder. **It is a published interface**, read by [`jpsusarreyHGS/ontology-compiler`](https://github.com/jpsusarreyHGS/ontology-compiler) — which states the ownership plainly: *"The harness is the authority for this format; if the two ever diverge, the harness wins."* So a template edit here is an API change there.

**[`docs/contract.md`](docs/contract.md) is what we have promised** — the anchor names, the filenames, the id rules, the parser semantics, and the four preconditions the compiler refuses to build past. Read it before changing anything in that folder.

Check before you hand over:

```bash
node packages/derive/src/cli.ts contract-check engagements/<slug>
```

It runs the compiler's own four refusals locally, so a gap is found on the day it was created rather than in a Python traceback weeks later. **Thinness is a warning; a missing owner is a refusal** — a question with no template yet is visible progress, a glossary term nobody owns is an unanswered question about who decides. Every refusal a person can answer carries a role, and `/next` ranks it above ordinary findings.

Then:

```bash
python -m core.importer engagements/<slug>/03-Systems/ontology --instance <slug> --target databricks
```

The target comes from `00-Setup/stack-decision.md`. **Choose it from the competency questions, not from precedent** — a triple store earns its place where relationship traversal and per-fact provenance are the point; where the questions are aggregations over known joins, a warehouse with a semantic model on top is less machinery for the same answer.

`ontology-engineer` is the only agent that writes to an ontology repo, and every write is logged in `03-Systems/ontology/promotion-log.md` against the requirement that justified it. The credit-union reference implementation now lives inside the compiler as `examples/srcu/`.

## Extending it

`CLAUDE.md` is the constitution — read it before changing anything structural. `harness-improver` may edit skills, templates and `CLAUDE.md`, but **never agent prompts**: those are the harness's contract, and changing one is a deliberate human action.

Nothing enters the library without a named engagement that needed it.
