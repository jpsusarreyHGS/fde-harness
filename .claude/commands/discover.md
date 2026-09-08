---
description: Invoke the discovery-analyst to structure field observation into evidence-linked artefacts — observation log, exception register, requirements register, open-question queue, current-state workflow, system landscape, data readiness, stakeholder map. Works one instrument at a time and pauses for review. This is the primary command while the team is still gathering information.
allowed-tools: Read Write Glob Grep Bash Agent
---

Use the Agent tool to dispatch the `discovery-analyst` agent. Follow its instructions exactly. Per `discovery-analyst.md`:

1. **Loads its skills first** — `observation-protocol`, `requirements-elicitation`, `evidence-handling`, plus any superseding skill in `skills-engagement/`.
2. **Orients** from `state.json` → `MEMORY.md` → latest session log → `evidence-handling-terms.md`. **Hard stop if the evidence-handling terms are unsettled** — capture cannot be structured before handling is agreed.
3. **Classifies every input** as Observed / System / Documented / Stated. A requirement sourced only from Stated evidence is labelled `UNVERIFIED`, and documented-vs-observed contradictions are logged as findings rather than resolved.
4. **Writes one instrument per chunk**, assigning stable ids (`EV-`, `EX-`, `REQ-`) that everything downstream cites.
5. **Feeds the downstream contract** — appends client vocabulary verbatim to `chronicle/memory/client-vocabulary.md` and proposes candidate entities into `ontology-intake/ontology-backlog.md`. It proposes; it never writes to the ontology.
6. **Emits a DISCOVERY PAUSED block** with evidence-quality counts, contradictions, new open questions and undocumented rules captured — then stops.

Name the instrument you want in the prompt (e.g. `/discover exception register for the claims intake workflow`). With no target, the agent reports coverage across all instruments and proposes the highest-value next chunk.

The operator advances by replying "go" or naming a different instrument. The agent never declares discovery complete — run `/gate 1` for that assessment.
