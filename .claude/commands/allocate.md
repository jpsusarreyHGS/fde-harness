---
description: Stage 04. Invoke the solution-architect in allocate mode to place the intelligence — assign every operating-map step to one of deterministic, model judgement, human gate or leave alone with a written reason, then rank workflows on value at stake and feasibility and produce the cost envelope. Includes the declines, argued.
allowed-tools: Read Write Glob Grep Agent
---

Use the Agent tool to dispatch the `solution-architect` agent in **`allocate` mode**. Per `solution-architect.md`:

1. **Step 0 orientation and gate** — reads `state.json`, memory, decisions and the G1 memo, emits a status dashboard, stops. Does not draft while a conflict between an artefact and a logged decision is unresolved.
2. **Loads `skills-practice/allocation-grid`** in full — `SKILL.md`, `driving-questions.md`, `prioritisation-axes.md` — and uses the categories and axes verbatim rather than inventing weights.
3. **Assigns every step** to exactly one of four categories **with a written reason**. Deterministic is the default. A reason cell reading "makes sense" has not been done.
4. **Answers the four driving questions per step** — blast radius (there is no context-free accuracy target), the 2 a.m. phone call, who owns it when we leave, whether volume makes improvement matter, and the fast-fix trade-off.
5. **Ranks on two axes** — value at stake and feasibility, taking the **lowest** feasibility factor rather than the average, because feasibility is a chain that breaks at its weakest link.
6. **Produces the cost envelope** — arithmetic, not hope, including **human-gate load**, which is the line teams forget and which dominates approval-heavy workflows.
7. **Writes the declines with their arguments.** Identifying something that should not be built is a deliverable; at G2 the bar is that the declines are argued convincingly.

Outputs: `04-Placement/allocation-grid.md`, `prioritisation.md`, `cost-envelope.md`, `value-hypothesis.md`.

Then stops. **The operator decides.** Placement informs the decision; it does not make it.
