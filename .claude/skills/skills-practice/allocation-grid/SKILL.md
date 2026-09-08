---
name: allocation-grid
description: Stage 04 — placing the intelligence. Assign every step of the operating map to exactly one of four categories (deterministic, model judgement, human gate, leave alone) with a written reason, then rank candidate workflows on two axes and deliver the matrix including the declines. Read before any placement judgement, prioritisation, or cost envelope. Supporting files carry the four driving questions and the prioritisation axes.
---

# The allocation grid

## What this stage decides

Take the operating map and **assign every step to exactly one of four categories, with a written reason.** The reason is the artefact — an allocation without one is not an allocation, and it will not survive the challenge at G2.

| Category | What belongs here |
|---|---|
| **Deterministic** | Rules, thresholds, lookups, transformations, routing on structured fields. Fast, cheap, auditable, exactly right every time. **Default here.** |
| **Model judgement** | Classification of unstructured input, extraction from messy documents, summarisation, ambiguous categorisation. Use where the input genuinely varies. |
| **Human gate** | Approval before an irreversible or externally visible action. Anything with regulatory, financial or reputational blast radius. |
| **Leave alone** | Too risky, insufficient ROI, already automated, or about to be replaced. **A legitimate and frequently correct answer.** |

**Deterministic is the default.** If the logic is documented and the inputs are structured, building it with a model makes it slower, more expensive and less predictable. Reach for model judgement where the input genuinely varies — and the exception register is your best evidence for where that is, because undocumented operator judgement is exactly what varies.

## Declining well is a deliverable

*Leave alone* is not a failure category. The ranked matrix delivered to the client **must include the workflows we recommend against automating**, and the bootcamp certifies the behaviour explicitly: "correctly identified at least one thing that should not be built."

Declining well is a demonstration of judgement, and clients read it as such. At G2 the requirement is that "**the two declines are argued convincingly**" — so write the argument, not just the verdict.

## The four questions that drive the call

Answer these per step, in writing. `driving-questions.md` carries them in full.

1. **What is the blast radius when this is wrong?** Determines whether 88% accuracy is excellent or unacceptable. **There is no context-free accuracy target.**
2. **Will I get a 2 a.m. phone call about this in six months?** If yes, either do not ship it or ship it properly. There is no third option.
3. **Who owns this when I leave?** Client, another team, another FDE. Decide before you build, not after.
4. **Is the volume high enough that improvement matters?** A perfect fix to a twice-monthly task is a rounding error.
5. **What is the trade-off for solving this fast?** Small wins with compounding negative consequences are a net loss you will pay for later.

## Prioritisation

Rank candidate workflows on **two axes** and take the top-right quadrant first. `prioritisation-axes.md` carries the scoring detail.

| Axis | What it measures |
|---|---|
| **Value at stake** | volume × time per instance × loaded cost, plus any risk or revenue effect. How much is actually on the table. |
| **Feasibility** | Data availability, API coverage, verifiability, exception density, political resistance. How likely you are to land it. |

Two axes, not seven. The simplicity is deliberate — a ranking a sponsor can hold in their head is a ranking that survives a steering meeting.

**Deliver the ranked matrix to the client as part of the assessment.** Show the working: the first question will be where the number came from.

## The cost envelope

Project unit economics **before the budget conversation**, into `04-Placement/cost-envelope.md`. At G2 the bar is that "**the cost envelope is arithmetic rather than hope**" — so show the arithmetic.

Per candidate, at expected volume: inference, compute, storage, connector calls, and **human-gate load**. That last line is the one teams forget, and on approval-heavy workflows it dominates.

A per-transaction cost above the manual cost it replaces is a finding. Finding it here costs an afternoon; finding it after the build costs the engagement's credibility.

## Output

- `04-Placement/allocation-grid.md` — `AL-` rows, one per operating-map step, each citing the step and carrying a written reason
- `04-Placement/prioritisation.md` — the two-axis matrix, ranked, **including the declines with their arguments**
- `04-Placement/cost-envelope.md` — the arithmetic
- `04-Placement/value-hypothesis.md` — baselines, captured while the current state is still observable

Then stop. **The operator decides.** Placement informs the decision; it does not make it.
