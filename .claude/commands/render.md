---
description: Any stage. Render engagement markdown to client-ready HTML with HGS brand styling. In-browser rendering via marked.js and mermaid.js — no Python or build step. Each source .md gets a sibling .html in deliverables/<slug>/<stage>/. No arguments renders the canonical client-facing set; pass a target name or an in-engagement relative path to render one.
allowed-tools: Read Write Glob Bash Skill
---

Use the Skill tool to invoke the `render-deliverables` skill and follow its instructions exactly.

With no arguments, renders the canonical client-facing set:

- `02-Workflow/operating-map.md` — the discovery deliverable
- `04-Placement/allocation-grid.md` and `prioritisation.md` — **including the declines**, which are part of the assessment
- `03-Systems/ontology/glossary.md`, `personas.md`, `competency-questions.md`
- `05-Build/architecture.md` and `architecture-diagram.md`
- `06-Evals/eval-report.md` — often the artefact that closes the deal
- `08-ROI/executive-readout.md`
- `engagement-management/roadmap.md` and the latest `stage-gate-<N>-readiness.md`

Accepted targets: any of the names above, or **any in-engagement relative path** — e.g. `/render 02-Workflow/exception-register` — resolved under `engagements/<slug>/` and rendered to the matching stage folder in `deliverables/<slug>/`.

Each file is rendered by the script, which runs the **client-safe pass** by default and prints a redaction report:

```bash
node scripts/render-deliverable.mjs <slug> <in-engagement path> [--internal] [--with-citations] [--keep-quotes]
```

**Nothing is a client deliverable until it has been rendered into `deliverables/`.** An internal working file is not a client artefact, however finished it looks. The pass takes out `Source` lines and columns, harness ids, unapproved names (rendered as their role) and verbatim observed quotes, and says what it removed — or that it removed nothing. **Read the report back to the operator.** What it cannot judge — raw observation rows, internal scoring commentary, anything under the evidence-handling redaction term — is still yours to raise before sending.
