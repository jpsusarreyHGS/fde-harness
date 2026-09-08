---
description: Rebuild state.json from the filesystem for one or all engagements, then render the FDE dashboard to a self-contained HTML file. The dashboard is the FDE's GUI — engagement portfolio, phase progress, discovery instrument coverage, evidence chain health, gate status, ontology and eval coverage, open questions and RAID. No arguments renders every engagement; pass a client slug to render one.
allowed-tools: Read Write Glob Bash Skill
---

Use the Skill tool to invoke the `render-dashboard` skill and follow its instructions exactly.

Two phases, in order:

1. **Derive** — rebuild `engagements/<client>/state.json` by counting what actually exists on disk (register rows, evidence ids, golden sets, session logs, gate memos). Never carry forward a stale number, and never adjust one to make the dashboard look better. If `state.json` and the files disagree, the files are right.
2. **Render** — write the self-contained dashboard HTML. No build step, no server, no network dependency beyond the Kanit webfont, which degrades to a system stack offline.

Output: `dashboard.html` at the harness root (portfolio view across all engagements) and `engagements/<client>/dashboard.html` per engagement.

A red gate or an empty instrument on the dashboard is the harness working. The dashboard's whole value is that it is the honest picture.
