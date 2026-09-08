---
description: Invoke the harness-improver to review the harness for staleness and gaps and propose targeted, evidence-based improvements gated behind per-proposal operator approval. Applies approved edits to skills, templates and CLAUDE.md; never edits agent prompts — those route to feedback for deliberate human promotion. Pass "close" for the engagement-close generalisation pass.
allowed-tools: Read Write Glob Grep Agent
---

Use the Agent tool to dispatch the `harness-improver` agent in **`session-end` mode** (or **`engagement-close` mode** if the operator passed `close`). Follow its instructions exactly. Per `harness-improver.md`:

1. **Declares its mode** at the start of its response.
2. **Gathers evidence** — the last three session logs (Harness friction and Problems encountered) plus every per-role feedback entry since the last run. **Evidence or nothing:** a proposal with no cited friction is the agent's opinion, and its opinion is not why it exists.
3. **Reviews each layer** — `CLAUDE.md` accuracy against how sessions actually ran; skill correctness and gaps; the skill-to-agent reference audit in **both** directions (stale pointers, missing references, inlined-value drift); whether any template was worked around; and `state.json` fidelity, since a dashboard that ever disagreed with the files is the one defect that silently erodes trust in the GUI.
4. **Proposes** in the numbered File / Evidence / Reason / Remove / Add / Routing / Approve? format, lists them all, then **waits**. Approval is per proposal, never batched.
5. **Applies approved changes** to `.claude/skills/**`, `CLAUDE.md` and `.claude/templates/**` only.

**Hard rules, non-overridable:** never Write or Edit any file under `.claude/agents/` — even with operator approval; proposed prompt edits are preserved verbatim in `harness-improver/feedback/<role>.md` for a separate deliberate promotion. Never bypass the approval gate, including for typo-class edits. Never promote client-identifying material into the asset library.

**`engagement-close` mode** runs the generalisation pass — the step that makes the practice compound and the one most likely to be skipped under end-of-engagement pressure. It asks the fixed question: what did we generalise, and where did it land?
