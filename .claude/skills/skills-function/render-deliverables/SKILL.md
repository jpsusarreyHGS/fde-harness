---
name: render-deliverables
description: Render engagement markdown to client-ready HTML with HGS brand styling. In-browser rendering via marked.js and mermaid.js UMD builds — no Python, no build step. Each source .md gets a sibling .html in the matching deliverables phase folder. Operator-invoked via /render.
allowed-tools: Read Write Glob Bash
---

# Render deliverables

## What this does

Takes a markdown artefact from `engagements/<slug>/` and writes a branded, self-contained HTML file to the matching phase folder in `deliverables/<slug>/`.

**Nothing is a client deliverable until it has been rendered.** An internal working file is not a client artefact, however finished it looks — and the render step is the checkpoint where that distinction gets enforced.

## The client-safe pass

**Code checks what is about to leave the building, on every render, by default.** This used to be a reminder to scan the source; a reminder is not a control, and a trainee's page went out with people's names and the call constraints in it. Now the render script runs the pass and prints a **redaction report** — what was removed, from where, why — and writes it beside the page as `<name>.redactions.md`. An FDE reads it in thirty seconds before sending.

| Removed | Rule | To keep it |
|---|---|---|
| `Source:` lines and `Source` table columns | provenance is internal | `--internal` |
| Inline harness ids — `EV-`, `EX-`, `Q-`, `REQ-`, `AL-`, `CQ-`, `HY-`, `WR-` | they point at internal registers | `--with-citations` |
| Named individuals → their role from `01-Organisation/stakeholder-map.md` | roles are client-safe; names need approval | add the name to `00-Setup/client-safe-names.md`, with who approved it |
| Text quoted verbatim from `evidence/observed/` → `[quotation withheld — confirm before sending]` | shadowing consent may not cover publication | `--keep-quotes`, once the operator has confirmed |

When the pass removes nothing the report says **"client-safe pass: nothing removed"** — silence is never ambiguous. `--internal` skips the pass and the report says so in bold; do not send an `--internal` render to a client.

Still yours to judge, because code cannot: **raw observation rows** (`observation-log.md` is internal by default — a client gets the synthesis), **internal scoring commentary**, and **anything under the redaction term** in `00-Setup/evidence-handling-terms.md`. If you find one of those, stop and ask.

The same pass runs inside `/sketch`, so a name that cannot leave through a deliverable cannot leave through the sketch either.

## Canonical set

With no argument, render:

| Source | Deliverable folder |
|---|---|
| `02-Workflow/operating-map.md` | `02-Workflow/` |
| `04-Placement/prioritisation.md` | `02-Workflow/` |
| `engagement-management/stage-gate-1-readiness.md` | `02-Workflow/` |
| `03-Systems/ontology/glossary.md` | `03-Systems/ontology/` |
| `03-Systems/ontology/personas.md` | `03-Systems/ontology/` |
| `03-Systems/ontology/competency-questions.md` | `03-Systems/ontology/` |
| `05-Build/spec.md` | `03-Systems/ontology/` |
| `05-Build/architecture.md` | `05-Build/` |
| `05-Build/architecture-diagram.md` | `05-Build/` |
| `engagement-management/roadmap.md` | `02-Workflow/` |
| latest `06-Evals/runs/*.md` | `06-Evals/` |

With an argument, accept any of those names or **any in-engagement relative path** — resolved under `engagements/<slug>/`, rendered to the matching phase folder.

## Mechanics

One command per file. Do not substitute by hand — the client-safe pass lives in the script, and a hand render skips it:

```bash
node scripts/render-deliverable.mjs <slug> <in-engagement path> [--internal] [--with-citations] [--keep-quotes]
```

It reads `template.html` in this directory, substitutes `{{TITLE}}`, `{{CLIENT}}`, `{{PHASE}}`, `{{DATE}}` and `{{CONTENT}}` (the markdown after the pass, in a script block), and writes `deliverables/<slug>/<stage folder>/<basename>.html` plus `<basename>.redactions.md`. Read the report back to the operator, every time.

Rendering happens in the browser: `marked.js` for markdown, `mermaid.js` for fenced `mermaid` blocks. Both from a pinned CDN version, with the page degrading to readable pre-formatted text if the CDN is unreachable — a deliverable that renders blank on a client laptop is worse than one that renders plainly.

## Brand

Follow `../render-dashboard/SKILL.md`'s brand table exactly — same tokens, same rules. Kanit, sentence case, and **Impact Green as an accent only, never behind body copy.** A client-facing document is where brand compliance actually gets noticed.

Every deliverable carries a footer with the client name, the phase, the render date and an "HGS Forward Deployed Engineering" line. A deliverable with no date will be read as current a year from now.
