---
description: Render engagement markdown to client-ready HTML with HGS brand styling. In-browser rendering via marked.js and mermaid.js — no Python or build step. Each source .md gets a sibling .html in deliverables/<client>/<phase>/. No arguments renders the canonical client-facing set; pass a target name or an in-engagement relative path to render one.
allowed-tools: Read Write Glob Bash Skill
---

Use the Skill tool to invoke the `render-deliverables` skill and follow its instructions exactly.

With no arguments, renders the canonical client-facing set:

- `02-Workflow/operating-map.md`
- `04-Placement/prioritisation.md`
- `engagement-management/stage-gate-1-readiness.md`
- `03-Systems/ontology/glossary.md`, `personas.md`, `competency-questions.md`, `use-cases.md`
- `05-Build/architecture.md` and `architecture-diagram.md`
- `engagement-management/roadmap.md`
- the latest `06-Evals/runs/*.md`

Accepted targets: any of the names above, or **any in-engagement relative path** — e.g. `/render 02-Workflow/exception-register` — resolved under `engagements/<client>/` and rendered to the matching phase folder in `deliverables/<client>/`.

**Nothing is a client deliverable until it has been rendered into `deliverables/`.** An internal working file is not a client artefact, however finished it looks. The render step is also the moment to check that internal-only material — raw observation rows, named individuals, unredacted exceptions — is not about to leave the building.
