---
name: render-deliverables
description: Render engagement markdown to client-ready HTML with HGS brand styling. In-browser rendering via marked.js and mermaid.js UMD builds — no Python, no build step. Each source .md gets a sibling .html in the matching deliverables phase folder. Operator-invoked via /render.
allowed-tools: Read Write Glob Bash
---

# Render deliverables

## What this does

Takes a markdown artefact from `engagements/<slug>/` and writes a branded, self-contained HTML file to the matching phase folder in `deliverables/<slug>/`.

**Nothing is a client deliverable until it has been rendered.** An internal working file is not a client artefact, however finished it looks — and the render step is the checkpoint where that distinction gets enforced.

## The redaction checkpoint

**Before rendering, check what is about to leave the building.** This is the single most important step in this skill, and the easiest to skip.

Scan the source for:

- **Named individuals.** Roles are fine; names usually are not. The exception register in particular tends to name the holder of an undocumented rule, and surfacing that person to their management can look like surfacing a workaround they are responsible for.
- **Raw observation rows.** `observation-log.md` is internal by default. A client readout gets the synthesis, not the timestamps.
- **Internal scoring commentary.** Qualification reasoning that says a stakeholder is unengaged is true, useful, and not a deliverable.
- **Anything under the redaction term** in `01-Discovery/evidence-handling-terms.md`.

If you find something, **stop and ask** — do not silently redact, because the operator may want it there, and do not silently render, because they may not.

## Canonical set

With no argument, render:

| Source | Deliverable folder |
|---|---|
| `01-Discovery/current-state-workflow.md` | `01-Discovery/` |
| `01-Discovery/use-case-qualification.md` | `01-Discovery/` |
| `01-Discovery/readiness-gate.md` | `01-Discovery/` |
| `02-Design/glossary.md` | `02-Design/` |
| `02-Design/personas.md` | `02-Design/` |
| `02-Design/competency-questions.md` | `02-Design/` |
| `02-Design/use-cases.md` | `02-Design/` |
| `03-Architecture/architecture.md` | `03-Architecture/` |
| `03-Architecture/architecture-diagram.md` | `03-Architecture/` |
| `engagement-management/roadmap.md` | `01-Discovery/` |
| latest `05-Evals/runs/*.md` | `05-Evals/` |

With an argument, accept any of those names or **any in-engagement relative path** — resolved under `engagements/<slug>/`, rendered to the matching phase folder.

## Mechanics

1. Read `template.html` in this directory.
2. Substitute: `{{TITLE}}`, `{{CLIENT}}`, `{{PHASE}}`, `{{DATE}}`, `{{CONTENT}}` (the raw markdown, JSON-escaped into a script block).
3. Write to `deliverables/<slug>/<phase>/<basename>.html`.

Rendering happens in the browser: `marked.js` for markdown, `mermaid.js` for fenced `mermaid` blocks. Both from a pinned CDN version, with the page degrading to readable pre-formatted text if the CDN is unreachable — a deliverable that renders blank on a client laptop is worse than one that renders plainly.

## Brand

Follow `../render-dashboard/SKILL.md`'s brand table exactly — same tokens, same rules. Kanit, sentence case, and **Impact Green as an accent only, never behind body copy.** A client-facing document is where brand compliance actually gets noticed.

Every deliverable carries a footer with the client name, the phase, the render date and an "HGS Forward Deployed Engineering" line. A deliverable with no date will be read as current a year from now.
