---
name: update-practice-skills
description: Refresh skills-practice from the practice asset repository, updating only files whose local copies have not been modified. Files an FDE edited locally are preserved; files still matching the canonical version are refreshed in place. Use when the operator says "update skills", "refresh skills", or asks to pull the latest practice method.
user-invocable: true
allowed-tools: Read Write Bash Glob
---

# Update practice skills

## The problem this solves

`skills-practice/` is shared across the practice and refreshed from upstream. It is also edited locally, mid-engagement, when an FDE finds the method wrong at 11pm on a Thursday.

A naive refresh destroys those edits — which teaches everyone never to refresh. So the refresh is **selective**: unmodified files update, modified files are left alone and reported.

## Procedure

1. **Detect the upstream.** Read the remote from `skills-practice/.git/config` if it is a clone; otherwise ask the operator for the asset repo URL and record it in the harness README.
2. **Fetch upstream** into a temporary location. Never fetch directly over the working directory.
3. **Classify every file** by comparing three versions — local, canonical (last fetched), upstream:

| Local vs canonical | Upstream vs canonical | Action |
|---|---|---|
| unchanged | changed | **Refresh** |
| unchanged | unchanged | Skip |
| changed | unchanged | **Preserve** — report as locally modified |
| changed | changed | **Preserve** — report as a conflict needing a human |
| — | new file | Add |
| deleted upstream, unchanged locally | — | Remove, and report it |
| deleted upstream, changed locally | — | **Preserve** and report — someone is relying on it |

4. **Apply**, then record the new canonical state so the next refresh can classify correctly.
5. **Report** every file in each category. A silent refresh is indistinguishable from no refresh.

## After a refresh, always

**Run the reference audit.** Upstream renames break hardcoded paths in agents and in `CLAUDE.md` without any change in this repo, and the failure is silent until an agent cannot find a skill mid-session.

Grep every skill path cited in `CLAUDE.md` and in `.claude/agents/**`, verify each resolves, and report any that do not.

Per the hard rule in `harness-improver.md`, **broken paths inside agent files are reported, not fixed** — agent prompts are edited only by deliberate human action. Fix the `CLAUDE.md` references directly and route the agent ones to the operator with the exact edit needed.

## Rules

- **Never overwrite a locally-modified file.** Preserve and report, always.
- **Never fetch over the working directory.** Temporary location, then apply.
- **Always run the reference audit afterwards.**
- **Never touch `skills-engagement/`.** That is client-calibrated and has no upstream.
