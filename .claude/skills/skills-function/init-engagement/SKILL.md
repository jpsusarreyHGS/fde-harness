---
name: init-engagement
description: One-shot content initialisation for an FDE engagement. Creates the canonical folder skeleton under engagements/<slug>/ and the mirrored deliverables/<slug>/ structure, interviews the operator for engagement metadata in one batch, seeds every starter artefact from .claude/templates/engagement-init/, and writes the initial state.json. Idempotent — fills missing pieces, never overwrites.
user-invocable: true
allowed-tools: Read Write Glob Bash AskUserQuestion
---

# Init engagement

## Properties to preserve

- **Idempotent.** Fill what is missing; never overwrite an existing file. Re-running on a live engagement must be safe, and operators will re-run it.
- **Template-seeded.** Every artefact comes from `.claude/templates/engagement-init/`. If a template is missing, **say so and stop** for that artefact — do not improvise it. A hand-rolled instrument will not match the next engagement's and will not parse into `state.json`.

## Step 1 — Gather metadata in one batch

Use `AskUserQuestion` once, not one question at a time:

| Field | Placeholder | Notes |
|---|---|---|
| Client name | `{{CLIENT_NAME}}` | Display name |
| Slug | `{{SLUG}}` | kebab-case; becomes the folder name |
| Executive sponsor | `{{SPONSOR}}` | Role and name if known |
| Scope, one line | `{{SCOPE}}` | What the pilot is |
| Non-goals | `{{NON_GOALS}}` | At least one; a scope with no non-goals is not bounded |
| Starting phase | `{{PHASE}}` | Usually `01-Discovery` |
| Target systems | `{{SYSTEMS}}` | Comma-separated |
| Ontology repo | `{{ONTOLOGY_REPO}}` | URL, or `tbd` |
| Data residency posture | `{{RESIDENCY}}` | `client-tenant` / `hgs-tenant` / `tbd` |
| Labour representation | `{{LABOUR}}` | `works-council` / `union` / `none` / `unknown` — drives the monitoring constraint |

If the operator does not know a value, write `TBD` and add a row to `01-Discovery/open-questions.md`. **Do not guess a sponsor or a residency posture** — both have consequences.

## Step 2 — Create the skeleton

Create all directories in one batched call:

```
engagements/{{SLUG}}/{01-Discovery/evidence,02-Design,ontology-intake,03-Architecture,04-Build/builds,05-Evals/{golden-sets,runs},06-Launch,chronicle/{memory,sessions},harness-improver/{feedback,improvements},engagement-management}
deliverables/{{SLUG}}/{01-Discovery,02-Design,03-Architecture,04-Build,05-Evals,06-Launch}
```

## Step 3 — Seed the artefacts

Read every template in `.claude/templates/engagement-init/` in **one batched call**, substitute placeholders, and write all files in **one batched call**. Per `CLAUDE.md`, this is the 4-step pattern — one batched read, one batched write, one verification. Roughly three round-trips, not forty.

Seed these, skipping any that already exist:

**Discovery** — `observation-log.md`, `exception-register.md`, `requirements-register.md`, `open-questions.md`, `stakeholder-map.md`, `current-state-workflow.md`, `system-landscape.md`, `data-readiness.md`, `use-case-qualification.md`, `value-hypothesis.md`, `evidence-handling-terms.md`, `readiness-gate.md`

**Design** — `glossary.md`, `personas.md`, `competency-questions.md`, `use-cases.md`, `source-systems.md`

**Ontology intake** — `ontology-backlog.md`, `entities.md`, `promotion-log.md`

**Architecture** — `architecture.md`, `architecture-diagram.md`, `access-model.md`

**Evals** — `autonomy-ledger.md`

**Chronicle** — `CHRONICLE.md`, `memory/MEMORY.md`, `memory/engagement-overview.md`, `memory/client-vocabulary.md`, `memory/decisions.md`, `memory/environment.md`

**Management** — `roadmap.md`, `raid-log.md`, `scope-changes.md`

**Feedback** — one file per role from `.claude/templates/harness-improver/feedback/`: discovery-analyst, ontology-engineer, solution-architect, engagement-manager, builder, evaluator, chronicle, harness-improver

## Step 4 — Write the initial `state.json`

Per `../render-dashboard/state-schema.md`. Every count is zero at init and every instrument is `empty`; that is correct and the dashboard should show it. **An engagement that looks half-populated at init has been seeded with fake numbers.**

## Step 5 — Report

State what was created, what already existed and was left alone, which templates were missing, and what metadata came back `TBD` with the open-question ids raised for each.

Then tell the operator the two things that must happen before capture: **settle the evidence-handling terms**, and **check the monitoring constraint** if labour representation is anything other than `none`.
