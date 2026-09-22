---
description: Stage 05. Invoke the solution-architect in build-plan mode to decompose the work into vertical slices and coordinate ontology-engineer, builder and evaluator per slice. Stops at every slice exit gate for operator review. Also the entry point for a self-contained POC with no prior discovery.
allowed-tools: Read Write Glob Grep Bash Agent
---

**Before dispatching, run the pre-flight.** If it exits non-zero, show its message and stop — do not dispatch. An agent isolated in a fresh worktree cannot see an engagement folder, and it should learn that here rather than three steps in.

```bash
node scripts/preflight.mjs engagements/<slug>
```

Use the Agent tool to dispatch the `solution-architect` agent in **`build-plan` mode**. Follow its instructions exactly. Per `solution-architect.md`:

1. **Step 0** confirms upstream readiness and emits the status dashboard, then stops. Upstream of stage `05` is **G1** (`03`→`04`) plus a completed stage `04`: the allocation grid and the ranked matrix must exist, because what was allocated to `human-gate` is not to be automated and `leave-alone` is not to be built. **G2 comes after evals, not before build.**
2. **Decomposes vertically** — a slice is a thin end-to-end path that produces something a client can see and an evaluator can test. Never by layer: a completed data layer with no visible surface cannot be reviewed and de-risks nothing.
3. **Writes the plan** to `engagement-management/build-plan-<date>.md`.
4. **Runs the loop per slice** — `ontology-engineer` for new objects and templates, `builder` for pipelines and surface, `evaluator` for golden cases and the run. Each dispatch names the skills to load, the requirement ids in scope, and the acceptance criteria.
5. **Emits a SLICE EXIT GATE** with requirements closed, eval result, autonomy measurement and open items — then waits.

The operator advances by replying "go" or naming a slice. The SA does not auto-advance, and never reports a slice complete on the strength of the builder's own report — the `evaluator` verdict is the evidence.

**Direct POC (no discovery):** for a fully-specified one-shot build, the SA skips the readiness gate, treats your prompt as the spec, and dispatches `builder` then `evaluator`. It still delegates — the method lives in the specialist agents, so building on the main thread bypasses every invariant they carry.
