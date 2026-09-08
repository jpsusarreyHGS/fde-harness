---
name: autonomy-ladder
description: Stage 07 — shipping into production. The five rungs a system is walked up, each with an explicit exit criterion, plus adoption as part of the deployment and the fold-in-or-discard call at ship time. Read before setting or claiming an autonomy level, designing a human gate, or planning a rollout.
---

# The autonomy ladder

## Never flip a switch

Walk the system up in stages, with an **explicit exit criterion at each rung** — and walk it up in person where you can, because guiding someone through this is far easier when you have sat next to them.

| Rung | The system… | Exit when |
|---|---|---|
| **1 · Controlled environment** | Runs against real data in a sandbox | Eval results are **stable across representative volume** |
| **2 · Shadow mode** | Runs in production alongside the human, output compared, **nothing actioned** | Agreement rate is acceptable **and disagreements are understood** |
| **3 · Human approval on every action** | Agent proposes, human approves | Approval has **become a formality** and the rejection rate is low **and explicable** |
| **4 · Autonomous with exception routing** | Acts within confidence thresholds, escalates outside them | Escalation volume is **stable and monitored** |
| **5 · Autonomous with monitoring** | Full production | Metrics, KPIs and SLAs instrumented, and **someone named owns it** |

Note what is not on this ladder: unattended action with no monitoring and no named owner. A request for that is a finding, not a rung.

## The exit criteria are the point

A rung is a **measurement against its own exit criterion**, not a phase name. "Phase 2 will be autonomous" is a plan; "agreed with the analyst on 94% of 210 live cases over three weeks, disagreements clustered on two exception types" is a decision you can defend.

Set the thresholds at architecture time, **before any measurement exists**, into `05-Build/architecture.md`. Delivery pressure will try to move them later — usually late, usually with a demo as the evidence.

**A demo is not a measurement. A stakeholder's confidence is not a measurement. Elapsed time is not a measurement.**

## Rung 2 in detail — shadow mode

Shadow mode is the instrument the whole ladder depends on and the one thing here with no adequate off-the-shelf answer: run alongside the human on live traffic, act on nothing, log both, compute agreement.

For a shadow run to count:

- **Live traffic, not replay.** A replayed dataset measures the dataset.
- **The human does not see the agent's output.** If they do, you are measuring influence, not agreement.
- **Both sides logged against the case id**, so disagreements are inspectable one by one.
- **A stated window and sample size, fixed before the run starts.** Choosing the window after seeing the data is how a threshold gets met.

### Understanding the disagreements matters more than the rate

The rung-2 exit criterion is agreement **and disagreements understood** — both halves.

- 92% clustered on one exception type is a **fixable gap**: a missing rule, probably already in the exception register, possibly a day's work.
- 92% scattered randomly is a **capability ceiling**: no amount of iteration will move it.

These look identical in a summary metric and demand opposite decisions. **Always categorise before reporting the rate.**

## Rung 3 — the gate is infrastructure, not policy

At approval-on-every-action the approval path is a system:

- A review queue carrying **the context needed to decide**, not just the proposed action
- A named approver **role**, resolved from the authenticated session
- An audit record of who approved what, when, and what they saw
- A **measured approval latency** — a path that becomes a bottleneck will be routed around, and a gate that is routed around is worse than no gate because it is still on the architecture diagram

The exit criterion is that approval has become a formality. If rejections stay frequent, the system is not ready; if rejections are rare but **inexplicable**, that is worse — nobody knows why it works.

## Adoption is part of the deployment

**A working system with no users is a failed engagement.**

- Hand-hold the first cohort personally.
- **Watch the first week of real usage the same way you watched the original workflow.** The tells that identified the opportunity will also tell you where the new system is failing people.
- **Treat resistance as information rather than obstruction.** When someone insists a system does not work and cannot articulate why, go and watch them use it. There is almost always a real requirement underneath that nobody thought to ask about.

Record this in `07-Production/adoption.md`.

## Before you leave — nothing is temporary

**Every hack goes into production and stays there.** If it makes someone's life easier it will run for years, and you will own it.

Make an explicit call at ship time on **every artefact**: fold it into the core offering, or discard it by a **named date**. Record both in `07-Production/fold-in-or-discard.md`.

"Temporary" is not a state — it is a story we tell ourselves on the way to supporting something for a decade. The bootcamp certifies this behaviour: "made an explicit fold-in / discard call on every artefact — nothing labelled 'temporary'."

## The ledger

`07-Production/autonomy-ledger.md`, append-only:

| Date | Workflow | Rung | Exit criterion | Sample | Window | Agreement | Disagreement pattern | Understood? | Decision | Decided by |

**A row with an empty measurement renders as "asserted, not measured" — deliberately, and in red.**

## What a rung does not license

A rung is measured per workflow, on the traffic it was measured on. It does **not** transfer to a different workflow however similar, to the same workflow after a model / prompt / ontology / data change (**that is a re-measurement trigger**), to a materially higher volume, or to another client.

State this boundary in the eval report. A rung read as broader than it is, is the most consequential misreading available here.
