---
description: Stages 01-03. Turn raw material into proposed instrument rows. Reads whatever is waiting in 02-Workflow/evidence/, extracts observations, exceptions, questions and map elements, and writes them as proposed rows — a file the FDE reviews, then accepts. Nothing reaches a register until it is accepted, and ids are minted by code at accept time.
allowed-tools: Read Write Glob Grep Bash Agent
---

**Before dispatching, run the pre-flight.** If it exits non-zero, show its message and stop — do not dispatch. An agent isolated in a fresh worktree cannot see an engagement folder, and it should learn that here rather than three steps in.

```bash
node scripts/preflight.mjs engagements/<slug>
```

Use the Agent tool to dispatch the `discovery-analyst` agent in **`transcribe` mode**.

This is the command that collapses the typing. An FDE hands over what they
already produced — notes, a transcript, an SOP, a photograph of a whiteboard —
and gets back rows to check, rather than a form to fill.

1. **See what is waiting**

   ```bash
   node packages/derive/src/cli.ts intake engagements/<slug>
   ```

   Material goes in the folder that says what it is. **The evidence class comes
   from the folder, never from the content** — a transcript dropped in
   `stated/` can never silently become primary evidence, however confidently it
   reads.

   | Folder | What belongs there |
   |---|---|
   | `evidence/observed/` | An FDE watched it — shift notes, a shadowing log |
   | `evidence/system/` | A log, export, record or config |
   | `evidence/documented/` | An SOP, policy, spec or deck |
   | `evidence/stated/` | An interview, call or meeting transcript |

   A file dropped outside a class folder is **reported, never guessed**.

2. **The agent extracts**, one source at a time, into **every instrument the
   material supports** — not only the stage-02 registers. A single interview
   commonly names the sponsor, three of the five roles, four systems and a
   dozen client terms, and a capture that lands only observation rows leaves
   the FDE answering "who is the process owner?" at the gate from notes the
   harness already read.

   | Stage | Instruments the transcribe lane may propose into |
   |---|---|
   | `01` | `stakeholder-map` (the five roles by **fill**; others and decision rights as rows) · `sponsor-brief` (the seven answers and the success sentence, by fill) |
   | `02` | `observation-log` · `operating-map` (all nine elements) · `exception-register` · `requirements-register` · `open-questions` |
   | `03` | `systems-inventory` · `readiness-scorecard` · `vocabulary-audit` · `ontology/backlog` (candidates only) |

   It never writes a register directly — it looks up the real columns and
   keys, writes a spec, and lets code build the file of **proposed rows
   (review, then `accept`)** — the harness calls that file a *proposal*:

   ```bash
   node packages/derive/src/cli.ts sweep   <engagement-dir> <source>        # the floor: who, what systems, which figures
   node packages/derive/src/cli.ts anchors <engagement-dir> [filter]        # the real columns, and the keys a fill can land on
   node packages/derive/src/cli.ts propose <engagement-dir> <spec.json>
   ```

   A column the instrument does not have is **refused with the real column
   list**, rather than dropped silently three steps later. `propose` then
   prints a **coverage block** — rows proposed per instrument beside what the
   sweep found in the source — so `stakeholder-map 0 rows ← source named 4
   people` is visible now, not at `/gate 1`.

3. **Skim and accept**

   ```bash
   node packages/derive/src/cli.ts pending engagements/<slug>
   node packages/derive/src/cli.ts accept  engagements/<slug> <proposal.md>
   ```

   Decided against it? `reject` it with a reason, so the queue stops showing
   work nobody will do:

   ```bash
   node packages/derive/src/cli.ts reject engagements/<slug> <proposal.md> "<reason>"
   ```

   The proposed rows are an ordinary markdown file. Fix a cell, delete a row
   that is wrong, then accept. **Ids are blank on purpose** — code mints them at accept
   time, so the sequence stays contiguous even if another session wrote in
   between, and the FDE never types or sequences one.

   An accept that cites an id which does not exist is **refused whole**. A
   partial accept would leave the register in a state nobody chose.

**What the agent must not do:** invent a frequency, guess a rule holder, assign
its own ids, or upgrade a confidence class. Anything it cannot source goes to
`open-questions.md` as a `Q-` — that is the material `/next` ranks and puts a name against.
