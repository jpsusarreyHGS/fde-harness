---
description: Scaffold a new FDE engagement. Creates the canonical folder skeleton under engagements/<client>/ and the mirrored deliverables/<client>/ structure, interviews the operator for engagement metadata in one batch, and seeds every starter artefact from .claude/templates/engagement-init/. Idempotent — fills missing pieces, never overwrites. Also writes the initial state.json so the dashboard has something to render.
allowed-tools: Read Write Glob Bash AskUserQuestion Skill
---

Use the Skill tool to invoke the `init-engagement` skill and follow its instructions exactly.

Skipping this command is the most common cause of folder drift across engagements — and a hand-rolled engagement folder will not parse into `state.json`, so the dashboard will show it as empty.
