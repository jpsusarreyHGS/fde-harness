---
name: autonomy-ladder
description: The four autonomy rungs for an FDE-delivered workflow and the measurement each one requires — shadow, suggest, act-with-approval, act-with-audit. Covers shadow-mode comparison, agreement-rate thresholds, divergence clustering, and why a rung is a measurement rather than a phase name. Read before setting or claiming an autonomy level, or designing a human gate.
---

# The autonomy ladder

## The premise

"Phase 2 will be autonomous" is a plan. "This workflow agreed with the analyst on 94% of 210 live cases over three weeks, with divergence clustered on two exception types" is a decision you can defend.

**A rung is a measurement, not a phase name.** The whole point of the ladder is to replace a negotiation about confidence with a number. Once a rung has a threshold written down, delivery pressure cannot move it — and delivery pressure will try, usually late, usually with a demo as the evidence.

## The four rungs

| Rung | The system… | Earned by |
|---|---|---|
| **Shadow** | runs alongside the human on live traffic and acts on nothing | being deployed and logging both sides |
| **Suggest** | proposes; the human does the work | agreement at or above the shadow threshold, sustained over the stated window |
| **Act with approval** | acts only after a named role approves | suggest-rung accuracy, plus a working approval path with audit |
| **Act with audit** | acts; every action logged and reversible | approval-rung accuracy, plus a proven rollback and a monitored error budget |

Note what is **not** on this ladder: unattended action with no audit and no rollback. That is not a rung, and an engagement that is asked for it should treat the request as a finding.

## Shadow mode

Shadow mode is the instrument the whole ladder depends on, and it is the one thing in this space with no adequate off-the-shelf answer: run the agent alongside the human on live traffic, act on nothing, log both, compute agreement.

Requirements for a shadow run to count:

- **Live traffic, not replay.** A replayed dataset measures the dataset.
- **The human does not see the agent's output.** If they do, you are measuring influence, not agreement.
- **Both sides logged with the case id**, so disagreements are inspectable case by case.
- **A stated window and a stated sample size**, fixed before the run starts. Choosing the window after seeing the data is how a threshold gets met.

## Thresholds

Set per engagement in `03-Architecture/architecture.md` at architect time, **before any measurement exists.** Defaults, to be adjusted by risk:

| Transition | Default threshold | Minimum sample |
|---|---|---|
| Shadow → Suggest | 90% agreement | 100 cases, 2 weeks |
| Suggest → Act with approval | 95% agreement, zero P0 in the window | 200 cases, 3 weeks |
| Act with approval → Act with audit | 98% agreement, proven rollback, error budget monitored | 500 cases, 4 weeks |

**Raise these for high-consequence workflows.** Where a wrong answer has regulatory, financial or safety consequence, the ladder may correctly stop at act-with-approval permanently. A workflow that never reaches the top rung is not a failed workflow.

## Divergence clustering matters more than the rate

**Report divergence categories, not just the agreement rate.** This is the single most important interpretive rule in this skill.

92% agreement where the 8% clusters on one exception type is a **fixable gap** — you have found a missing rule, probably one already sitting in the exception register, and closing it may take a day.

92% scattered randomly across case types is a **capability ceiling** — the workflow may not be suitable at this rung at all, and no amount of iteration will move it.

These look identical in a summary metric and require completely different decisions. Always categorise the disagreements before reporting the rate.

## The human gate is infrastructure

At act-with-approval, the approval path is a system, not a policy:

- A review queue with the context needed to decide, not just the proposed action
- A named approver **role**, resolved from the authenticated session
- An audit record of who approved what, when, and what they saw
- A measured approval latency — an approval path that becomes a bottleneck will be routed around, and a gate that is routed around is worse than no gate because it is still on the architecture diagram

Design for the load. Approval-heavy workflows are where human-gate cost dominates unit economics, which is why qualification projects it.

## The ledger

Every measurement goes to `05-Evals/autonomy-ledger.md`:

| Date | Workflow | Rung | Sample | Window | Agreement | Divergence clusters | P0 count | Decision | Decided by |
|---|---|---|---|---|---|---|---|---|---|

**Never write a rung into the ledger without the measurement columns filled.** A ledger row with an asserted rung is the artefact this entire skill exists to prevent, and once it is written down it will be cited.

## What a rung does not license

A rung is measured per workflow, on the traffic it was measured on. It does not transfer to:

- A different workflow, however similar
- The same workflow after a model, prompt, ontology or data change — **that is a regression trigger**
- A volume materially above the measured window
- A new client, ever

State this boundary in the eval report. A rung read as broader than it is, is the failure mode with the worst consequences on this list.
