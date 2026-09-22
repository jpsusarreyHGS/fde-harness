---
description: The three conversations to have tomorrow, with names attached. Turns the judgment-chain audit and the open gate's criteria into ranked questions, grouped by who can answer them, each saying what it blocks and where the answer gets written. Use it at the end of a session to plan the next one, and at the start to remember what you were chasing.
allowed-tools: Read Glob Grep Bash
---

Run the coach and read the result back to the operator:

```bash
node packages/derive/src/cli.ts next engagements/<slug> [groups]
```

This is the half of the harness that talks back. Everything else records what
the FDE found; this says what they are still missing, and — more usefully — who
to ask.

## What it is doing

Three inputs, one queue:

| Input | What it contributes |
|---|---|
| The judgment-chain audit | Exceptions with no rule holder, requirements with no source, gaps that never became a `Q-` |
| The open gate's criteria | The client's own definition of ready, each with an owner |
| `open-questions.md` | Questions the FDE already wrote and has not answered |

**Only the gate you are working toward.** Every criterion of G2 and G3 is unmet
on day one; a queue that opens with "prove it with evals" during stage 01 is one
nobody reads twice.

## How it ranks

Two factors, both visible in the `why:` line under every question. A ranking
that cannot explain itself is one nobody trusts twice — and this console has
already rendered "ranked by what is blocked" over a sort by age once.

1. **What it blocks.** `Blocks` is joined to `prioritisation.rows`, so a gap in
   the #1 workflow outranks an older gap in a workflow nobody chose. When the
   join finds nothing, the `why:` line says so rather than pretending.
2. **How fast it perishes.** An operator's undocumented rule is elicitable while
   you are sitting beside them and effectively gone three weeks later. A
   dangling citation costs minutes at a desk in November.

Two things it deliberately does **not** do:

- **It does not re-ask what the FDE already wrote down.** A finding about
  `EX-002` disappears from the queue when an open question already mentions
  `EX-002` — their wording carries the client's vocabulary and already names who
  can answer.
- **It does not put desk work in the conversation list.** A dangling citation is
  a real defect that nobody at the client can answer. Those come out at the end,
  under "yours to fix".

## Reading it back

**Start with "Verify first"**, if the output has one. Those are gate criteria
whose answer is already on file — the sponsor's sentence in the brief, the
five roles in the map. Read the quoted value back and ask the operator to say
it in their own words. The bar has not moved; what has changed is that the
queue is no longer asking for something it is holding.

Then report the groups as conversations, not as a list. An FDE gets one
conversation with the exception holder, not four — walking in with everything
at once is the difference between one interruption and four.

For each group, give the name, then the questions in the operator's own likely
phrasing. Say what each one blocks. **Do not paraphrase away the specificity** —
"who decides on EX-002" is useful; "clarify the exception process" is not.

Then say plainly what the queue does not know: if `prioritisation.rows` is
empty, nothing is ranked by value and you are ordering by perishability alone.
Say that rather than presenting the order as more considered than it is.

**When the operator answers a question in chat, stop and write it down before
moving on.** Offer the command with the text pre-filled — the question as the
queue phrased it (or its `Q-` id), the answer verbatim, and `--from` set to
whoever the operator said it came from:

```bash
node packages/derive/src/cli.ts answer engagements/<slug> "<Q-id or question>" "<answer, verbatim>" --from "<who said it>"
```

Do not continue to the next question until they have accepted or declined it.
An answer that stays in chat is asked again tomorrow — that is the failure this
step exists to prevent.

## After the conversation

Answers go into the instrument, not into chat. The `answer` verb above writes
each one into `02-Workflow/evidence/stated/<date>-answers.md` — `stated`
because an answer someone gave you is something a person said, and it becomes
primary evidence only by being watched. `intake` lists the file, `/capture`
proposes rows from it, and the FDE accepts them. Nothing reaches a register
until then.
