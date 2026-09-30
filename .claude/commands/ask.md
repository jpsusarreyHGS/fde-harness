---
description: Any time. Ask a question and get an answer with nothing changed — no file edited, no agent started, no command run. Answers about an engagement cite the file and row they came from; answers about the method cite the canon document or skill. Use it when you want to know something, not do something.
argument-hint: <your question>
allowed-tools: Read Glob Grep
---

# Ask

**The question:** $ARGUMENTS

Answer it. That is the whole job.

## The rule

**This command changes nothing.** Do not create or edit a file, do not dispatch
an agent, do not run a command — not the CLI, not a script, not `git`. That
holds even when the answer shows something that ought to be fixed: say what you
found and which command would fix it, then stop. The FDE decides whether to act.

`allowed-tools` pre-approves reading and nothing else, so an edit would stop at
a permission prompt. That is a backstop, not a sandbox. For a hard guarantee,
run the session in Plan mode.

## Where answers come from

Cite what you use: the file path, and the row id or the table's anchor.

| The question is about | Read |
|---|---|
| This engagement — who, what was agreed, what has been seen | The instruments under `engagements/<slug>/`. The registers are the record |
| Where the engagement stands | `engagements/<slug>/state.json`. Say when it was generated — it is derived, and may be older than the files |
| What someone said, verbatim | `02-Workflow/evidence/<class>/`. Say which class: a `stated` answer is not an `observed` one |
| What was sold, and what we believed going in | `00-Setup/engagement-mandate.md`, `00-Setup/entry-hypotheses.md` |
| The method — stages, frameworks, what a gate needs | `docs/canon/` first, then `.claude/skills/skills-practice/` |
| How the harness itself works | `CLAUDE.md`, `README.md`, `docs/`, and the code in `packages/derive/src/` |

**Which engagement.** If the question names one, use it. If `engagements/`
holds exactly one, use that. Otherwise ask which — answering about the wrong
client is worse than asking.

## How to answer

- **Lead with the answer**, in a sentence or two. Then the evidence.
- **Cite it, or say the files do not have it.** When the engagement does not
  record the answer, say so, name the instrument where it would go, and stop.
  Never fill the gap from general knowledge: a plausible answer with no source
  is the silently-filled gap `CLAUDE.md` calls a defect.
- **Keep the evidence classes.** "The sponsor said X" and "we watched X" are
  different answers. Say which one you have.
- **Canon wins.** If the harness and a canon document disagree, say so and give
  the canon's answer.
- **Point, don't do.** When the honest answer is "that needs doing", end with
  the command that would do it — `/capture`, `/next`, `/gate 1`,
  `cli.ts answer …` — and leave the choice to the FDE.

## When another command answers it better

These need code to run, which `/ask` does not do. Name the command instead of
approximating its answer from the files.

| Question | Command |
|---|---|
| What should I ask tomorrow, and whom? | `/next` — it ranks from the audit, and reading the registers cannot reproduce the ranking |
| What do I run next? | `/commands` |
| Is the chain intact? Is anything unsourced or dangling? | `node packages/derive/src/cli.ts engagements/<slug> --audit` |
| Will the ontology compiler accept it? | `node packages/derive/src/cli.ts contract-check engagements/<slug>` |
