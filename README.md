# HGS FDE harness — MVP

A Claude Code project harness for HGS Forward Deployed Engineering engagements. Specialist subagents, slash commands and a practice method library, weighted toward the front half of an engagement: **establishing what is actually true about a client's work before anything gets built.**

Comes with an FDE dashboard — a GUI over engagement state, generated from the engagement's own files.

## What it gives you

| | |
|---|---|
| **8 specialist agents** | discovery-analyst, ontology-engineer, solution-architect, engagement-manager, builder, evaluator, chronicle, harness-improver |
| **12 slash commands** | the engagement pipeline plus dashboard, render and the improvement loop |
| **7 practice skills** | observation protocol, requirements elicitation, ontology-first delivery, use-case qualification, evidence handling, the autonomy ladder, the G1 gate |
| **41 templates** | every discovery instrument, the design contract layer, architecture, chronicle, RAID and per-role feedback |
| **A dashboard** | portfolio and per-engagement views, derived from `state.json` |

## Prerequisites

- [Claude Code](https://claude.com/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- [`uv`](https://docs.astral.sh/uv/) — used by `scripts/convert_to_md.py` to read PDF, Word, PowerPoint and Excel
- `git`, and access to the practice asset repository if you are refreshing `skills-practice/`

## Setup

```powershell
.\setup.ps1        # Windows
```

```bash
./setup.sh         # macOS / Linux / WSL
```

Setup verifies prerequisites, checks the harness layout, and refreshes `skills-practice/` from the practice asset repository if one is configured. It is safe to re-run — local edits to skills are never overwritten.

Then start Claude Code in this directory:

```bash
claude
```

## Running an engagement

```
/init-engagement          scaffold engagements/<slug>/ and deliverables/<slug>/
/discover                 structure field observation into evidence-linked artefacts
/qualify                  score and rank the candidate use cases
/gate 1                   discovery readiness memo
/ontology                 promote discovery into the client domain model
/architect                target architecture, diagram, access model
/gate 2                   build readiness memo
/build                    vertical slices, delegated build loop
/evaluate                 golden sets, eval runs, autonomy measurement
/gate 3                   release readiness memo
/dashboard                rebuild state.json and render the GUI
/render                   render client-facing deliverables
/chronicle                log the session, refresh memory and state.json
/harness-improver         propose harness improvements from cited friction
```

`/discover` is the command you will live in while the team is still gathering information. Everything downstream consumes what it produces.

Run `/chronicle` at the end of every session. It is what keeps the next session from starting blind, and it is what makes the dashboard true.

## Folders

| | |
|---|---|
| `engagements/` | All working files per engagement — instruments, design, architecture, chronicle, evals |
| `deliverables/` | Client-facing outputs, mirrored per engagement and phase |
| `datasources/` | Drop client input files here. **Read-only to the harness** |
| `.claude/skills/skills-practice/` | The practice's method — reusable across every client |
| `.claude/skills/skills-engagement/` | Client-calibrated skills; supersede practice skills |
| `.claude/templates/` | Instrument templates. Every engagement artefact is seeded from here |

## The two ideas worth understanding before you use it

**1. The boundary rule.** `skills-practice/` and `templates/` hold **assets** — reusable across every client. `engagements/<client>/` holds **instances** — true for exactly one client. Every instance is seeded by an asset, and every engagement returns something to the asset library at close. An engagement that compounds nothing is staffing, not a practice.

**2. The evidence chain.** Every artefact traces backwards:

```
observation → evidence id → requirement → ontology object
  → competency question → eval case → use case → build task → release
```

It is enforced at write time, not review time. A requirement with no `Source:` is not a requirement; an entity with no requirement is speculative modelling; a competency question nobody asks is a query you wrote for yourself. When the chain cannot be closed, the agents say so — an honest gap is a finding, a silently-filled gap is a defect that surfaces at UAT.

## The dashboard

```
/dashboard
```

Two phases: **derive** `state.json` by counting what exists on disk, then **render** self-contained HTML. Opens by double-click — no server, no build step.

`state.json` is derived, never authoritative. If it disagrees with the engagement files, the files are right — re-derive. **Never hand-edit it to make the dashboard look better.** A red gate is the harness working.

## Ontology pipeline

The reference ontology implementation is [`Abishek-Hariharan-HGS/AI_Ontology_Credit_Union`](https://github.com/Abishek-Hariharan-HGS/AI_Ontology_Credit_Union). Its `docs/00-business/` layer is the discovery-to-ontology contract, and the harness's `02-Design/` folder is where that layer is assembled before promotion — see `.claude/skills/skills-practice/ontology-first-delivery/reference-architecture.md` for the mapping and for which of its properties to keep when adapting the stack to a new domain.

`ontology-engineer` is the only agent that writes to an ontology repo, and every write is logged in `ontology-intake/promotion-log.md` against the requirement that justified it.

## Reading binary documents

```bash
uv run --script --frozen scripts/convert_to_md.py "<path>" --out ./tmp_conversion.md
# xlsx/xlsm: extract literal cell formulas rather than computed values
uv run --script --frozen scripts/convert_to_md.py "<path>.xlsx" --formulas --out ./tmp_formulas.md
```

The first run downloads pinned dependencies; later runs use the cache. Write output into the engagement folder, read it, then delete it — a stray conversion is an unredacted copy of client material outside its intended store.

## Before your first capture

Two things, in this order, and neither is optional:

1. **Settle the evidence-handling terms.** Residency, retention, redaction, access, deletion, onward use. `discovery-analyst` hard-stops without them, because evidence captured under unresolved terms may have to be destroyed.
2. **Check the monitoring constraint.** Desktop task mining and session replay are employee monitoring. In works-council jurisdictions and unionised environments they need consultation, not notice — and getting it wrong ends an engagement rather than delaying it.

See `.claude/skills/skills-practice/evidence-handling/SKILL.md`.

## Extending it

`CLAUDE.md` is the constitution — read it before changing anything structural. `harness-improver` may edit skills, templates and `CLAUDE.md`, but **never agent prompts**: those are the harness's contract, and changing one is a deliberate human action, not something an agent does mid-engagement.

Nothing enters the asset library without a named engagement that needed it.
