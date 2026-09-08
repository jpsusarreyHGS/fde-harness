---
description: Invoke the solution-architect in qualify mode to score and rank the candidate use-case portfolio on value, feasibility, data readiness, AI suitability, risk, time-to-value and cross-account reusability. Data readiness caps feasibility, and unit economics are projected before the budget conversation. Writes 01-Discovery/use-case-qualification.md.
allowed-tools: Read Write Glob Grep Agent
---

Use the Agent tool to dispatch the `solution-architect` agent in **`qualify` mode**. Follow its instructions exactly.

1. **Step 0 orientation and gate** — reads `state.json`, memory, decisions and the G1 readiness memo, then emits an ARCHITECT STATUS dashboard and stops. Conflicts between a design artefact and a logged decision must be resolved by the operator before drafting.
2. **Loads `use-case-qualification`** and uses its scoring model verbatim rather than inventing weights.
3. **Scores every candidate** with the breakdown visible per row — a ranking whose reasoning is invisible gets re-argued at every steering meeting.
4. **Applies two honesty rules:** data readiness caps feasibility (a high-value use case on inaccessible data is blocked, not top-ranked), and per-transaction unit economics are projected at expected volume before anyone commits a budget.

Output is the ranked portfolio in `01-Discovery/use-case-qualification.md`, which feeds `02-Design/use-cases.md` and the build plan.
