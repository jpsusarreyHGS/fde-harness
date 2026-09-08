---
description: Invoke the engagement-manager in gate mode to produce the stage-gate readiness memo for G1 (discovery to design), G2 (design to build) or G3 (build to launch). Assesses each criterion with evidence paths, names what closes any gap and who owns it, and states the caveats the operator would be accepting. Recommends; never decides.
allowed-tools: Read Write Glob Grep Agent
---

Use the Agent tool to dispatch the `engagement-manager` agent in **`gate` mode**. Pass the gate number (`/gate 1`, `/gate 2`, `/gate 3`).

Per `engagement-manager.md`, the agent loads `discovery-readiness-gate` (essential for G1), assesses every criterion as met / not met / partially met with an evidence path, and writes the memo to `engagement-management/stage-gate-<N>-readiness.md`.

| Gate | Between | Cannot pass without |
|---|---|---|
| **G1** | Discovery to Design | Named sponsor, bounded scope, defined value with a baseline, feasible data, known risks, agreed acceptance criteria, settled evidence terms |
| **G2** | Design to Build | Competency questions answerable, personas mapped to permissions, source-to-object mappings, ranked use cases with ACs |
| **G3** | Build to Launch | Eval thresholds met, autonomy rung measured not asserted, rollback path, support model, client sign-off |

**A gate is a stop, not a status update.** The memo recommends READY / READY WITH CAVEATS / NOT READY; the operator decides. If everything looks green on the first pass the agent re-checks the weakest criterion — an all-green memo on a real engagement is usually one that was not read carefully.

After the decision, record it in `chronicle/memory/decisions.md` with the operator named and any accepted caveats.
