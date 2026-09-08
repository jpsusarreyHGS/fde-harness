---
description: Run the chronicle protocol on the main thread to write the session log, append per-role agent feedback, update engagement memory, and regenerate state.json so the dashboard is current. Runs in the main thread rather than as a dispatched subagent because the session narrative it must capture lives only in the current context. Invoke at session end, at a milestone, or any time on request.
allowed-tools: Read Write Glob Bash
---

Run the **chronicle protocol yourself, on the main thread — do not dispatch a subagent.** The log must capture what happened in *this* session, and that narrative lives only in your current context; a freshly-dispatched chronicle subagent would start with none of it and could only reconstruct a lossy log from files. This is the one harness protocol that is not delegated — chronicle carries no client-system access and no domain skills, so a dispatch buys nothing and costs the session context.

Read `.claude/agents/harness/chronicle.md` and follow its protocol exactly — that file is the source of truth. In summary:

1. **Identify the engagement** (ask if unclear); resolve `{eng}` as `engagements/<client>/`. If it does not exist, tell the operator to run `/init-engagement` and stop.
2. **Read the two most recent logs** under `{eng}/chronicle/sessions/*.md` for continuity.
3. **Determine the next filename** `YYYY-MM-DD-NNN.md`, incrementing for today.
4. **Write the session log** with the full structure — summary, work completed, evidence and artefact deltas with id ranges, decisions, problems, open items, memory updates, next steps, harness friction, cross-session implications. Write what happened, not what was intended.
5. **Append per-role feedback** — one new dated six-section entry per agent that produced output, to `{eng}/harness-improver/feedback/<role>.md`. Append only; never overwrite.
6. **Update memory** — dated appends to `engagement-overview.md`, `client-vocabulary.md`, `decisions.md`, `environment.md`. Prose only.
7. **Regenerate `state.json`** per `.claude/skills/skills-function/render-dashboard/state-schema.md`, **deriving every count from the filesystem in one batch of calls** — not from recollection. If a count and the narrative disagree, the filesystem wins and the discrepancy goes in Harness friction.
8. **Refresh the indexes** — `MEMORY.md` and `CHRONICLE.md`.

Safe to run at any point. Because it runs on the main thread it sees the live session and needs no handoff prompt.
