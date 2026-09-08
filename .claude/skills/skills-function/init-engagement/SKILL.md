---
name: init-engagement
description: One-shot content initialisation for an FDE engagement. Creates the ten stage folders under engagements/<slug>/ and the mirrored deliverables/<slug>/ structure, gathers engagement metadata, seeds every starter artefact from .claude/templates/engagement-init/, and writes the initial all-zero state.json. Idempotent — fills missing pieces, never overwrites.
user-invocable: true
allowed-tools: Read Write Glob Bash AskUserQuestion
---

# Init engagement

## Properties to preserve

- **Idempotent.** Fill what is missing; never overwrite. Operators will re-run this on live engagements.
- **Template-seeded.** Every artefact comes from `.claude/templates/engagement-init/`. If a template is missing, **say so and stop for that artefact** — do not improvise it. A hand-rolled instrument will not carry the table anchors the parser needs, so the dashboard will not read it.

## Step 1 — Gather metadata in one batch

Use `AskUserQuestion` once, not one question at a time.

| Field | Placeholder | Notes |
|---|---|---|
| Client name | `{{CLIENT_NAME}}` | Display name |
| Slug | `{{SLUG}}` | kebab-case; becomes the folder name |
| Executive sponsor | `{{SPONSOR}}` | Role and name if known |
| Scope, one line | `{{SCOPE}}` | What the pilot is |
| Non-goals | `{{NON_GOALS}}` | At least one. A scope with no non-goals has not been bounded |
| Starting stage | `{{STAGE}}` | Usually `00-Setup` |
| Target systems | `{{SYSTEMS}}` | Comma-separated |
| Ontology repo | `{{ONTOLOGY_REPO}}` | URL, or `tbd` |
| Data residency | `{{RESIDENCY}}` | `client-tenant` / `hgs-tenant` / `tbd` |
| Labour representation | `{{LABOUR}}` | `works-council` / `union` / `none` / `unknown` — drives the monitoring constraint |

If a value is unknown, write `TBD` and raise a `Q-` in `02-Workflow/open-questions.md`. **Do not guess a sponsor or a residency posture** — both have consequences.

*(In the target platform this interview is replaced by a web intake form; the placeholders are the form's fields.)*

## Step 2 — Create the skeleton

One batched call:

```
engagements/{{SLUG}}/{00-Setup,01-Organisation,02-Workflow/evidence,03-Systems/ontology,04-Placement,05-Build/builds,06-Evals/{golden-sets,runs},07-Production,08-ROI,09-Loop,skills-engagement,chronicle/{memory,sessions,run-events},harness-improver/{feedback,improvements},engagement-management}
deliverables/{{SLUG}}/{00-Setup,01-Organisation,02-Workflow,03-Systems,04-Placement,05-Build,06-Evals,07-Production,08-ROI,09-Loop}
```

## Step 3 — Seed the artefacts

Read every template in **one batched call**, substitute placeholders, write all files in **one batched call** — the 4-step pattern from `CLAUDE.md`. Roughly three round-trips, not fifty.

Skip anything that already exists. Seed all **50** templates under `engagement-init/`, plus the **8** per-role feedback files from `.claude/templates/harness-improver/feedback/`. If those counts do not match what you find on disk, say so — a missing template is a defect, not something to work around.

## Step 4 — Write the initial `state.json`

Per `../render-dashboard/state-schema.md`.

**Every count is zero at init and every instrument is `empty`.** That is correct and the dashboard should show it. An engagement that looks half-populated at init has been seeded with fake numbers — and note that the templates deliberately ship **no data rows**, only `role=labels` tables whose fixed rows the parser does not count.

## Step 5 — Report

State what was created, what already existed, which templates were missing, and what came back `TBD` with the question ids raised.

Then tell the operator the two things that must happen before capture: **sign the evidence-handling terms**, and **check the monitoring constraint** if labour representation is anything other than `none`.
