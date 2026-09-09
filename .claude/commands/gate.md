---
description: Gates G1 (03 to 04), G2 (06 to 07) and G3 (08 to 09). Invoke the engagement-manager in gate mode to produce a stage-gate readiness memo. G1 discovery (03 to 04), G2 build (06 to 07), G3 production (08 to 09), using the bootcamp's Week 1, Week 2 and capstone bars. Assesses criteria and behaviours with evidence, names what closes each gap and who owns it. Recommends; never decides.
allowed-tools: Read Write Glob Grep Bash Agent
---

Use the Agent tool to dispatch the `engagement-manager` agent in **`gate` mode**. Pass the gate number (`/gate 1`, `/gate 2`, `/gate 3`).

The agent loads `skills-practice/stage-gates` and writes to `engagement-management/stage-gate-<N>-readiness.md`.

| Gate | Between | The bar |
|---|---|---|
| **G1 — Discovery** | `03` → `04` | Operating map + exception inventory at standard · five roles identified correctly with defensible decision rights · readiness scorecard with the data landmines found · draft ontology with the canonical grain **chosen and defended** · evidence terms signed |
| **G2 — Build** | `06` → `07` | **The system works** (held-out slice, acceptance threshold, zero silent failures) · **the evidence exists** (failure taxonomy, audit trail on any run the reviewer picks, regression gate blocks a deliberately broken change) · **the judgment is defensible** (allocation grid survives challenge, declines argued, cost envelope is arithmetic not hope) |
| **G3 — Production** | `08` → `09` | Shadow mode passed with disagreements understood · UAT complete · client review held · a **measured** outcome not a projected one · fold-in-or-discard called on every artefact · a library contribution accepted |

**Gates assess behaviours, not only artefacts.** G1 requires that the team can state the sponsor's real problem in one sentence that is *not* what they asked for — the sharpest test in the gate. If they can only restate the request, discovery has not happened.

**A gate is a stop, not a status update.** The memo recommends READY / READY WITH CAVEATS / NOT READY; the operator decides. **Code never sets `passed`** — a person does, with a name. An all-green memo on first pass usually means it was written from intent rather than evidence; the agent re-checks the weakest criterion.

After the decision, record it in `chronicle/memory/decisions.md` with the operator named and any accepted caveats.
