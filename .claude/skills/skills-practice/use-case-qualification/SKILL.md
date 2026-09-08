---
name: use-case-qualification
description: How to score and rank candidate use cases on an FDE engagement — the seven scoring dimensions, why data readiness caps feasibility, projecting unit economics before the budget conversation, and the reusability dimension that decides what compounds across accounts. Read before producing or reviewing the use-case qualification matrix. Supporting file carries the scoring model and worked bands.
---

# Use-case qualification

## What this is for

Discovery produces more candidates than an engagement can deliver. Qualification decides which one goes first, and — just as important — **makes the reasoning visible so it is not re-argued at every steering meeting.**

A ranking whose score breakdown is hidden will be relitigated by whoever liked a different candidate. Show the working.

## The seven dimensions

Scored 1-5 each. `scoring-model.md` carries the bands.

| Dimension | The question |
|---|---|
| **Value** | What does solving this move, against a baseline we actually measured? |
| **Feasibility** | Can we build it with what exists, in the pilot window? |
| **Data readiness** | Is the data available, accessible, and good enough — today? |
| **AI suitability** | Does this need judgment over messy context, or is it a rules engine wearing an AI costume? |
| **Risk** | What is the cost of a wrong answer, and is there a human gate where it matters? |
| **Time to value** | How soon does someone see something real? |
| **Reusability** | Does this compound across accounts, or is it bespoke forever? |

## The three rules that keep this honest

**1. Data readiness caps feasibility.** A high-value use case sitting on data nobody can access is not a top-ranked candidate — it is a blocked one. Cap the feasibility score at the data-readiness score and **name the blocker and its owner**. This single rule prevents the most common FDE failure: a beautifully-scoped pilot that spends six weeks waiting for a database credential.

**2. Unit economics before the budget conversation.** Project per-transaction cost at expected volume — inference, compute, storage, connector calls, and **human-gate load**. That last one is the one people forget, and on approval-heavy workflows it dominates.

A use case whose per-transaction cost exceeds the manual cost it replaces is a finding. Finding it here costs an afternoon; finding it after the build costs the engagement's credibility.

**3. AI suitability is a real filter, not a formality.** If the logic is deterministic and fully documented, it is a rules engine, and building it with a model makes it more expensive, slower and less predictable. Score it low and say so.

The inverse also holds: work that looks deterministic but where an operator's undocumented judgment is doing the real work — visible in the exception register — is exactly what belongs here. The exception register is the best available evidence for this dimension.

## Reusability, and why it is on this list

The test for a practice, not a staffing model, is whether engagement N+1 is cheaper than engagement N. Reusability is the only dimension on this list that speaks to that.

Score it on: does this produce a connector, an ontology pattern, an agent template or a module that another account in our pipeline would use? A use case that scores 5 on everything else and 1 here is a good first project and a bad first investment. Both facts are worth putting in front of the sponsor.

## Output

The matrix in `01-Discovery/use-case-qualification.md`, ranked, with per-dimension scores visible, plus:

- **The blocker column** — for anything capped by data readiness, the blocker and its owner
- **The unit-economics column** — projected per-transaction cost and the volume assumed
- **A recommendation** — which one goes first and why, in two sentences a sponsor can repeat

Then stop. The operator decides. Qualification informs the decision; it does not make it.
