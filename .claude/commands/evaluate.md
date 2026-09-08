---
description: Invoke the evaluator to build golden sets from the exception register and competency questions, run the eval suites, measure shadow-mode agreement to set the autonomy rung, and return a pass/fail verdict with severity-tagged failures and a routing hint per failure. The eval report is often the client-facing artefact that closes the deal.
allowed-tools: Read Write Glob Grep Bash Agent
---

Use the Agent tool to dispatch the `evaluator` agent. Follow its instructions exactly. Per `evaluator.md`:

1. **Loads `autonomy-ladder`** in full, plus `observation-protocol` — it needs to know how the exception register was built to build cases from it.
2. **Builds golden sets from evidence, never from imagination.** Every case cites an `EX-NNN` or a `CQ-NN`; a case the agent invented tests its idea of the domain, not the client's. Five suites: competency, exception, retrieval, tool use, regression.
3. **Runs and reports** expected vs actual per case, with failures tagged P0-P3 and routed by type. **P0 is a stop** — a wrong answer presented confidently, an unauthorised write, or a permission-boundary crossing gets flagged immediately rather than at the end of the suite.
4. **Measures the autonomy rung** into `05-Evals/autonomy-ledger.md` with sample size, agreement rate and **divergence categories** — 92% clustered on one exception type is a fixable gap; 92% scattered is a capability ceiling, and the report says which.
5. **Emits the eval report** with a mandatory boundary section stating what the verdict does *not* cover. A verdict without it reads as broader than it is, and that misreading is what a client will hold HGS to.

The agent never marks a case passed without running it, never softens a P0, and never sets a rung without a logged measurement.
