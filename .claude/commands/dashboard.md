---
description: Any stage. Rebuild state.json from the filesystem for one or all engagements, then render the FDE dashboard to a self-contained HTML file. The dashboard is the FDE's GUI — engagement portfolio, phase progress, discovery instrument coverage, evidence chain health, gate status, ontology and eval coverage, open questions and RAID. No arguments renders every engagement; pass a client slug to render one.
allowed-tools: Read Write Glob Bash Skill
---

Use the Skill tool to invoke the `render-dashboard` skill and follow its instructions exactly. The whole thing is one command:

```bash
node scripts/render-dashboard.mjs [<slug>]
```

Two phases, in order, both done by the script:

1. **Derive** — rebuild `engagements/<client>/state.json` by counting what actually exists on disk (register rows, evidence ids, golden sets, session logs, gate memos). Never carry forward a stale number, and never adjust one to make the dashboard look better. If `state.json` and the files disagree, the files are right.
2. **Render** — write the self-contained dashboard HTML. No build step, no server, no network dependency beyond the Kanit webfont, which degrades to a system stack offline.

Output: `dashboard.html` at the harness root (portfolio view across all engagements) and `engagements/<client>/dashboard.html` per engagement. Read back what the script printed, and if it refused an engagement as tampered, say so — do not render around it.

A red gate or an empty instrument on the dashboard is the harness working. Early in an engagement the card leads with what is waiting, what is pending, the G1 checklist and the next conversations, and the coverage grid appears once the first rows are accepted. The dashboard's whole value is that it is the honest picture with a next action on it.
