---
name: four-tests
description: Stage 06 — turning non-determinism into evidence. The four tests every agent output is scored against, the failure-taxonomy report format that persuades clients, and how to build golden datasets including for subjective work. Read before designing evals, running a suite, or writing an eval report.
---

# The four tests

## Why this is a deliverable, not a phase

An eval suite is **how a probabilistic system becomes something an enterprise will put its name on**. It is frequently the artefact that closes the deal, and at G2 it is half the gate: "the evidence exists."

Every output is scored against four tests. Each is a distinct failure class, and keeping them distinct is what makes the report actionable.

| Test | The question |
|---|---|
| **Test 01 — Did it have the right data?** | Was the correct record retrieved, complete and current? |
| **Test 02 — Did it take the required steps?** | Was the process followed, **including the ones that exist for compliance reasons**? |
| **Test 03 — Does it match an expert?** | Compared against how a competent human handled the same case. |
| **Test 04 — Is it safe to act on?** | If not, it routes to a human gate. **That routing is a design outcome, not a failure.** |

Test 04 is the one most often misread. A system that correctly declines to act is passing, not failing. Score the routing decision, not the absence of an action.

## The report format

This is the artefact you put in front of the client, and it is far more persuasive than any accuracy percentage:

```
50 runs · 41 passed · 9 failed
  5 × missing upstream data
  4 × wrong record retrieved
→ both failure classes addressable; re-run scheduled after fix
```

Three properties make it work:

1. **Absolute counts, not a percentage.** "82%" invites an argument about the target. "41 of 50, and here is what the 9 were" invites a fix.
2. **Failures grouped by class**, mapped to the four tests. A class is fixable; a scattered 18% is not.
3. **A stated next action** with a re-run scheduled.

**Failures are not something to minimise in the report.** They are the input to the next iteration, and **showing them is what makes the passes credible.** A report with no failures reads as a report that was not run honestly.

Write it to `06-Evals/eval-report.md` and render it to `deliverables/<slug>/06-Evals/`.

## Golden datasets

**Where history exists, use it.** Ten thousand previously categorised emails give you an eval set immediately, with the client's own implicit standards already encoded.

**Every golden case cites an `EX-` or a `CQ-`.** A case you invented tests your idea of the domain, not the client's. This is why the exception register is treated as first-class in stage 02.

Per case record: id, source id, input, expected output, tolerance, and **who adjudicates disagreement**. Where the expected answer depends on an undocumented rule, quote the rule and name its holder. If nobody can adjudicate, the case is not ready — say so.

### Subjective work

Where the output is subjective — a drafted document, a client-ready presentation — the approach still holds: **mine the existing corpus for the implicit standards nobody wrote down, and encode them.**

But be honest about the ceiling. **Evals will never fully close the gap on subjective work.** So build permanent human-in-the-loop feedback into the system so it keeps improving. **A feedback mechanism is part of the deliverable, not a phase two.**

## The regression gate

At G2 the bar includes: "**regression gate blocks a deliberately broken change**." So the gate must be tested by breaking something on purpose and confirming it blocks. A regression suite nobody has seen fail is a regression suite of unknown value.

Re-run triggers: any change to prompts, models, the ontology, source data, or tool definitions. A rung on the autonomy ladder does not survive a model change — that is a re-measurement trigger.

## Severity

| Severity | Meaning |
|---|---|
| **P0** | Wrong answer presented as correct, an unauthorised write, or a permission-boundary crossing |
| **P1** | Requirement unmet, or a top-frequency exception mishandled |
| **P2** | Degraded — incomplete, unattributed, or past the stated tolerance |
| **P3** | Cosmetic or low-frequency |

**P0 is a stop**, and it maps to the G2 requirement of **zero silent failures**. A confidently wrong answer is worse than an error message, because nothing downstream catches it. Everything below the confidence threshold must route to a gate rather than proceed.

## Boundary

Every verdict states what it does **not** cover: client-led UAT, load at production volume, long-horizon drift, and exceptions not yet in the register. A verdict read as broader than it is, is the failure mode with the worst consequences here.
