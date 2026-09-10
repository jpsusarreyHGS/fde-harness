# HGS FDE harness

A Claude Code project harness implementing the HGS Forward Deployed Engineering practice method — the ten stages of `fde-engagement-runbook.html`, with the artefacts that pass the bootcamp's gates.

**The runbook is canon.** This harness implements it. Where the two disagree, the runbook wins and the divergence is a defect to report.

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
| **A dashboard** | portfolio and per-engagement views, derived from `state.json` |

## The frameworks it implements

Straight from the runbook, not invented:

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

## Setup

```powershell
.\setup.ps1        # Windows
```

```bash
./setup.sh         # macOS / Linux / WSL
```

Then start Claude Code in this directory and scaffold an engagement:

```bash
claude
```

```
/init-engagement
```

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

The reference implementation is [`Abishek-Hariharan-HGS/AI_Ontology_Credit_Union`](https://github.com/Abishek-Hariharan-HGS/AI_Ontology_Credit_Union). Its `docs/00-business/` layer is a **discovery deliverable**, not a modelling artefact — `03-Systems/ontology/` is where it is assembled before promotion. See `skills-practice/ontology-first-delivery/reference-architecture.md`.

`ontology-engineer` is the only agent that writes to an ontology repo, and every write is logged in `03-Systems/ontology/promotion-log.md` against the requirement that justified it.

## Reading binary documents

```bash
uv run --script --frozen scripts/convert_to_md.py "<path>" --out ./tmp_conversion.md
uv run --script --frozen scripts/convert_to_md.py "<path>.xlsx" --formulas --out ./tmp_formulas.md
```

Write into the engagement folder, read it, delete it — a stray conversion is an unredacted copy of client material outside its intended store.

## Before your first capture

Two things, in order, neither optional:

1. **Sign the evidence-handling terms** — residency, retention, redaction, access, deletion, onward use. `discovery-analyst` hard-stops without them, because evidence captured under unresolved terms may have to be destroyed.
2. **Check the monitoring constraint.** Desktop task mining and session replay are employee monitoring. In works-council jurisdictions and unionised environments they need **consultation, not notice** — and getting it wrong ends an engagement rather than delaying it.

See `.claude/skills/skills-practice/evidence-handling/SKILL.md`.

## Extending it

`CLAUDE.md` is the constitution — read it before changing anything structural. `harness-improver` may edit skills, templates and `CLAUDE.md`, but **never agent prompts**: those are the harness's contract, and changing one is a deliberate human action.

Nothing enters the library without a named engagement that needed it.
