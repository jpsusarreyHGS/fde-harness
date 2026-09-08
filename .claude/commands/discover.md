---
description: Stages 01-03. Invoke the discovery-analyst to structure field observation into the operating map, exception register, requirements register, open questions, stakeholder map, systems inventory and readiness scorecard. Works one instrument at a time and pauses for review. The primary command while the team is still gathering information.
allowed-tools: Read Write Glob Grep Bash Agent
---

Use the Agent tool to dispatch the `discovery-analyst` agent. Per `discovery-analyst.md`:

1. **Loads its skills first** — `observation-protocol` in full (including `operating-map.md`, `the-five-roles.md`, `the-four-tells.md`), `requirements-elicitation`, `evidence-handling`, plus any superseding skill in `engagements/<slug>/skills-engagement/`.
2. **Orients** from `state.json` → `MEMORY.md` → latest session log → `00-Setup/evidence-handling-terms.md`. **Hard stop if the terms are unsigned** — capture cannot be structured before handling is agreed.
3. **Classifies every input** as Observed / System / Documented / Stated. Stated-only requirements are labelled `UNVERIFIED`, and documented-versus-observed contradictions are logged as findings rather than resolved.
4. **Decomposes steps properly.** "An email arrives" is never one step — decompose until each has a single actor, a single system and a single outcome. Where you cannot, you have found a judgement point.
5. **Writes one instrument per chunk**, assigning stable append-only ids (`EV-`, `EX-`, `REQ-`, `Q-`).
6. **Fills all nine operating-map elements** — including **dead ends** (outputs nobody consumes) and **failure modes** (what breaks, who notices, **who gets blamed**, what recovery is), the two most often skipped and disproportionately valuable.
7. **Feeds the downstream contract** — appends client vocabulary verbatim to `03-Systems/vocabulary-audit.md` and proposes candidate entities into `03-Systems/ontology/backlog.md`. It proposes; it never writes to the ontology.
8. **Emits a DISCOVERY PAUSED block** with evidence-quality counts, contradictions, new open questions and undocumented rules captured — then stops.

Name the instrument in the prompt (e.g. `/discover failure modes for the claims intake workflow`). With no target the agent reports coverage and proposes the highest-value next chunk.

The agent never declares discovery complete — run `/gate 1` for that.
