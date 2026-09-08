---
name: render-dashboard
description: Rebuild state.json from the filesystem and render the FDE dashboard to self-contained HTML. Two phases — derive, then render. The dashboard is the FDE's GUI over engagement state; it reads only state.json. Operator-invoked via /dashboard.
allowed-tools: Read Write Glob Bash
---

# Render dashboard

Two phases, strictly in order. Never render without deriving first — a dashboard built on a stale `state.json` is worse than no dashboard, because it is believed.

## Phase 1 — Derive

Read `state-schema.md` in this directory. It is the contract; follow it exactly.

**Every value is counted from the filesystem.** Not carried forward, not recalled from the session, not estimated.

Derivation is driven by the **table anchors** (`<!-- table:<instrument>.<table> role=... -->`), never by heading text. Only `role=register` tables contribute counts; `role=kv` and `role=labels` are ignored. A heading can be reworded without breaking the parse; an anchor cannot be reworded by accident.

Fire the counting calls in one batch:

| Field group | Derived from |
|---|---|
| `instruments[].rows` · `.tables[]` | `role=register` tables only, per anchor. `role=kv` and `role=labels` are never counted |
| `chain.evidence` | `EV-` rows in `02-Workflow/observation-log.md`, grouped by the `Class` column |
| `chain.exceptions` | `EX-` rows; count those with a rule holder and those whose `Frequency` is a rate rather than `unquantified` |
| `chain.requirements` | `REQ-` rows; count non-empty `Source`, confidence class, AC present |
| `chain.allocations` | `AL-` rows in `04-Placement/allocation-grid.md`, by `Category`, plus how many carry a non-trivial reason |
| `chain.ontologyObjects` | Rows in `03-Systems/ontology/promotion-log.md` and `backlog.md` |
| `chain.competencyQuestions` | `CQ-` rows in `03-Systems/ontology/competency-questions.md`, by `Status` |
| `chain.evalCases` | Cases across `06-Evals/golden-sets/*.md`; pass/fail from the latest run |
| `chain.audit` | **Computed validation**: unsourced requirements, orphan evidence, dangling `Source` citations, stale `UNVERIFIED`, unowned assumptions |
| `stages[]` | Per-stage ratio from the table in `state-schema.md` — never a subjective estimate |
| `gates[]` | Parsed from `engagement-management/stage-gate-<N>-readiness.md`, criteria **and** behaviours |
| `openQuestions[]` | `Q-` rows with no `Answered` date. **Do not store `ageDays`** — compute from `raised` at read time |
| `raid[]` | Rows in `engagement-management/raid-log.md` |
| `prioritisation[]` | Rows in `04-Placement/prioritisation.md`; `feasibility` is the **lowest** factor, not the average |
| `autonomy[]` | Rows in `07-Production/autonomy-ledger.md` measurements table |
| `evals` | `06-Evals/eval-report.md` — the four tests, failure classes, regression gate, audit trail |
| `roi` | `08-ROI/roi-model.md` — nine inputs with `provenance`, four outputs, counter-metrics, attribution |
| `deliverables[]` | Files in `deliverables/<slug>/` |
| `datasources[]` | Files in `datasources/<slug>/` — name, size, classification |
| `skills` | `skills-practice/` and `skills-function/` counts, plus `engagements/<slug>/skills-engagement/` and detected supersedes |
| `harnessImprover` | Feedback files with entries, open proposals, pending prompt edits |
| `sessions` | Files in `chronicle/sessions/`, latest filename and its Summary line |
| `runEvents` | JSON events in `chronicle/run-events/` — the reason derivation needs no interactive session |
| `friction[]` | Harness friction sections from the last three session logs |

**Two rules:**

- **If a count and the session narrative disagree, the filesystem wins.** Regenerate and note the discrepancy — it usually means an agent wrote somewhere unexpected.
- **Never adjust a number to make the dashboard look better.** A red gate is the harness working. `state.json` is the honest picture or it is worthless.

`status` derivation for instruments: `empty` = 0 rows; `thin` = 1 to 4; `populated` = 5 or more — counting **`role=register` rows only**. A freshly initialised engagement must derive all-zero and all-`empty`; anything else means fake seed data.

**Gates: derive up to `ready` only.** `passed` requires a non-null `decidedBy` set by a person. A file showing `passed` with a null `decidedBy` is tampered — reject it rather than rendering it. Report the thresholds in the footer so nobody misreads a `thin` as broken.

## Phase 2 — Render

> **Status: the bundled `dashboard-template.html` still renders schema v1** (`phases[]`, `useCases[]`, four autonomy rungs). It is retained so the existing view keeps working, but it does **not** show stages `00`-`09`, the allocation grid, the four tests or the ROI model. It is regenerated against v2 when the derive package lands, and the web app takes over the UI after that. Do not extend it in the meantime — fix the schema and the parser first.


Read `dashboard-template.html` in this directory. Substitute the state as a JSON blob into the `STATE` placeholder and write the result.

Outputs:

- `dashboard.html` at the harness root — portfolio view across every engagement
- `engagements/<slug>/dashboard.html` — single-engagement view

The template is self-contained: no build step, no server, no dependency beyond the Kanit webfont, which degrades to a system stack offline. It opens by double-click.

## Brand

The dashboard follows HGS brand standards. Do not substitute colours or fonts:

| Token | Value | Use |
|---|---|---|
| Impact Green | `#ABCF02` | Accent only — **use judiciously; never for large text blocks or backgrounds behind body copy** |
| Primary Blue | `#00B0F0` | Interactive, links, active state |
| Deep Blue | `#001C41` | Headers, rails, dark surfaces |
| System | `#26476B` | Panels, secondary surfaces |
| Teal | `#3D9B99` | Labels, category accents |
| Foundation Grey | `#5C6D72` | Secondary text |
| Core Charcoal | `#2D2D2D` | Body text |
| Sage | `#9AAC94` | Muted / deferred states |
| Orange | `#E67300` | Alerts and callouts |
| Red | `#D12536` | Strong alerts, errors, failed gates |

Typography: **Kanit** — Bold for top-level headlines, Medium/Regular for everything else. **Always sentence case.** Never title case a heading.

Status colour mapping, applied consistently: passed/met → Impact Green; in progress → Primary Blue; caveats/partial → Orange; not-ready/failed/P0 → Red; not started/deferred → Sage.

## Rules

- **The dashboard reads only `state.json`.** It never parses markdown itself. One parser, in one place, testable.
- **Never hand-edit `state.json`** to change what the dashboard shows. Fix the underlying file and re-derive.
- **An empty engagement renders as empty.** Do not seed sample data into a real engagement's state to make the GUI look alive.
