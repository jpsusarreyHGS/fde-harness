---
description: Stage 06. Invoke the evaluator to score the system against the four tests, build golden sets from the exception register and competency questions, run the suite, and produce the client-facing eval report with a failure taxonomy. Also measures shadow-mode agreement for the autonomy ladder.
allowed-tools: Read Write Glob Grep Bash Agent
---

**Before dispatching, run the pre-flight.** If it exits non-zero, show its message and stop — do not dispatch. An agent isolated in a fresh worktree cannot see an engagement folder, and it should learn that here rather than three steps in.

```bash
node scripts/preflight.mjs engagements/<slug>
```

Use the Agent tool to dispatch the `evaluator` agent. Per `evaluator.md`:

1. **Loads `skills-practice/four-tests`** and `skills-practice/autonomy-ladder` in full, plus `observation-protocol` — it needs to know how the exception register was built to build cases from it.
2. **Scores every output against the four tests:** did it have the right data · did it take the required steps including the compliance ones · does it match an expert · **is it safe to act on**. A system that correctly declines to act is *passing* — the routing is a design outcome, not a failure.
3. **Builds golden sets from evidence, never from imagination.** Every case cites an `EX-` or a `CQ-`. Where history exists it is mined directly; for subjective work the corpus is mined for the implicit standards nobody wrote down.
4. **Reports in the runbook's format** — absolute counts, failures grouped by class, a stated next action. Failures are not minimised: they are the input to the next iteration, and showing them is what makes the passes credible.
5. **Tests the regression gate by breaking something on purpose** and confirming it blocks. A regression suite nobody has seen fail is of unknown value.
6. **Measures shadow-mode agreement** into `07-Production/autonomy-ledger.md` with the **disagreement pattern** — clustered means a fixable gap, scattered means a capability ceiling, and they demand opposite decisions.
7. **States what the verdict does not cover.** Mandatory.

**P0 is a stop** — a confidently wrong answer, an unauthorised write, or a permission-boundary crossing. It maps to the G2 requirement of zero silent failures.

Output: `06-Evals/eval-report.md`, rendered to `deliverables/<slug>/06-Evals/`. It is often the artefact that closes the deal.
