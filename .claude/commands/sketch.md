---
description: Any point before G1. Render the alignment sketch — one self-contained HTML page of what we think we heard, built only from accepted rows, with the evidence class on every line and a PROVISIONAL banner. The one artefact allowed in deliverables/ before the discovery gate. Shows what was heard, never what will be built.
allowed-tools: Read Bash Skill
---

Use the Skill tool to invoke the `render-sketch` skill and follow its instructions exactly.

```bash
node packages/derive/src/cli.ts sketch engagements/<slug>
```

Writes `deliverables/<slug>/sketch/<date>.html`. Read back what it printed — the counts per section and the sparse-section line — and say plainly which sections are empty. **Do not offer to fill them.** A step with no accepted row does not appear; a pending proposal is not read; the sketch never invents. If the operator wants more on the page, the route is `/capture` and accept, not editing the HTML.

The banner reads `PROVISIONAL — pre-G1 alignment sketch` in the header and the footer. It is not removable by argument: a sketch is not a design, has passed no gate, and every panel is provisional. If the operator asks for it gone, the answer is `/gate 1` and then `/render`.
