---
name: render-dashboard
description: Rebuild state.json from the filesystem and render the FDE dashboard to self-contained HTML. Two phases — derive, then render. The dashboard is the FDE's GUI over engagement state; it reads only state.json. Operator-invoked via /dashboard.
allowed-tools: Read Write Glob Bash
---

# Render dashboard

Two phases, strictly in order. Never render without deriving first — a dashboard built on a stale `state.json` is worse than no dashboard, because it is believed.

## Phase 1 — Derive

Read `state-schema.md` in this directory. It is the contract; follow it exactly.

**Every value is counted from the filesystem.** Not carried forward, not recalled from the session, not estimated. Fire the counting calls in one batch:

| Field group | Derived from |
|---|---|
| `instruments[].rows` | Table rows in each discovery instrument (exclude header and separator) |
| `chain.evidence` | `EV-` rows in `observation-log.md`, grouped by the class column |
| `chain.exceptions` | `EX-` rows; count those with a rule holder and those with a numeric frequency |
| `chain.requirements` | `REQ-` rows; count `Source:` present, confidence class, AC present |
| `chain.competencyQuestions` | `CQ-` rows in `02-Design/competency-questions.md`, by status |
| `chain.ontologyObjects` | Rows in `promotion-log.md` and `ontology-backlog.md` |
| `chain.evalCases` | Cases across `05-Evals/golden-sets/*.md`; pass/fail from the latest run |
| `gates[]` | Parsed from `engagement-management/stage-gate-<N>-readiness.md` |
| `openQuestions[]` | `Q-` rows with no answered date; `ageDays` computed from raised date |
| `raid[]` | Rows in `raid-log.md` |
| `autonomy[]` | Rows in `05-Evals/autonomy-ledger.md` |
| `useCases[]` | Rows in `use-case-qualification.md` |
| `datasources[]` | Files in `datasources/<slug>/` — name, size, classification |
| `skills` | Directory counts under `.claude/skills/`, plus detected supersedes |
| `harnessImprover` | Feedback files with entries, open proposals, pending prompt edits |
| `sessions` | Files in `chronicle/sessions/`, latest filename and its Summary line |
| `friction[]` | Harness friction sections from the last three session logs |

**Two rules:**

- **If a count and the session narrative disagree, the filesystem wins.** Regenerate and note the discrepancy — it usually means an agent wrote somewhere unexpected.
- **Never adjust a number to make the dashboard look better.** A red gate is the harness working. `state.json` is the honest picture or it is worthless.

`status` derivation for instruments: `empty` = 0 rows; `thin` = 1 to 4 rows; `populated` = 5 or more. Report the thresholds in the footer so nobody misreads a `thin` as broken.

## Phase 2 — Render

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
