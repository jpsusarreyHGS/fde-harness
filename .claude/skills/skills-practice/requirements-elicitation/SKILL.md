---
name: requirements-elicitation
description: How to convert field evidence into sourced, testable requirements on an FDE engagement — the sourcing rule, confidence classes, writing acceptance criteria that can actually fail, splitting compound requirements, and handling contradictions between documented and observed process. Read before writing or reviewing the requirements register. Supporting file carries the sourcing rules in detail.
---

# Requirements elicitation

## The one rule

**A requirement with no source is not a requirement.**

Every row in the register cites at least one `EV-` or `EX-` id. Something with no evidence behind it goes to `open-questions.md`, or into the register explicitly tagged `ASSUMPTION` with a named owner who can confirm it.

This is not process hygiene. An unsourced requirement is indistinguishable from a sourced one once it is in the register, and by the time it is wrong it has an ontology object, a build task and a test behind it. Enforcing sourcing at write time costs seconds; discovering an unsourced requirement at UAT costs a slice.

## Confidence classes

| Class | Basis | Consequence |
|---|---|---|
| `verified` | Observed or system evidence | Can drive an ontology object and a build task |
| `UNVERIFIED` | Stated evidence only | Can drive design; **must be verified before build** |
| `ASSUMPTION` | No evidence | Needs a named owner and a confirmation date; never silently promoted |

**Never quietly upgrade a class.** Promotion from `UNVERIFIED` to `verified` requires new evidence and a citation to it. If someone confirms a requirement in a meeting, that is still Stated evidence — it is now better-attested Stated evidence, not verified.

## Writing acceptance criteria

An acceptance criterion has to be able to **fail**. If you cannot describe the input and the output that would constitute a failure, you have written a hope.

| Not an AC | An AC |
|---|---|
| "Handles exceptions correctly" | "Given a case matching EX-007 (payment received after close), the system routes to the reconciliation queue and does not close the case" |
| "Fast enough" | "P95 response under 3s at 40 concurrent users" |
| "Accurate" | "Agrees with the analyst decision on at least 95% of the EX-012 golden set, with disagreements reported not suppressed" |
| "Secure" | "A CLERK-role session requesting a SUPERVISOR write receives a denial and the attempt is audited" |

**Never invent an AC for someone else's requirement.** If a requirement arrives without one, ask. An AC you wrote yourself is a test you will pass, which is the same as no test.

## Splitting compound requirements

If a statement contains "and", "also", or a list, consider splitting it. Compound requirements are the main cause of a slice that is 80% done for three weeks: one half passes, the other blocks, and the status is neither.

Split when the halves could be delivered, tested or blocked independently. Keep together when neither half means anything alone.

## Contradictions

When the documented process and the observed process disagree, **that is a finding, not a discrepancy to resolve.**

Log it in `open-questions.md` with both source ids and a plain statement of the divergence. Do not pick a winner. The gap between the two is frequently where the entire opportunity lives — the SOP says three approvals and the observation shows one, and the reason is either a control that is not working or a control that was never needed. Which one it is changes the engagement, and it is not the analyst's call.

Flag it to the operator explicitly. A contradiction buried in a register row will not be seen.

## Scope discipline

A requirement is prioritised **against the pilot charter**, not in the abstract. "Must" means the pilot fails without it. If everything is a must, the charter is not bounded and that is the finding to raise.

When a stakeholder adds a requirement mid-engagement, it goes through `engagement-manager` in `scope` mode. Requirements added directly to the register during a working session are how scope creep enters — it almost never arrives labelled as a scope request.
