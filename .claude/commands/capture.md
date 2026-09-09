---
description: Stages 01-03. Turn raw material into proposed instrument rows. Reads whatever is waiting in 02-Workflow/evidence/, extracts observations, exceptions, questions and map elements, and writes a proposal the FDE skims and accepts. Nothing reaches a register until it is accepted, and ids are minted by code at accept time.
allowed-tools: Read Write Glob Grep Bash Agent
---

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

2. **The agent extracts**, one source at a time, and proposes rows for the
   observation log, the operating map's nine elements, the exception register,
   and the open-question queue. It never writes a register directly.

3. **Skim and accept**

   ```bash
   node packages/derive/src/cli.ts accept engagements/<slug> <proposal.md>
   ```

   The proposal is an ordinary markdown file. Fix a cell, delete a row that is
   wrong, then accept. **Ids are blank on purpose** — code mints them at accept
   time, so the sequence stays contiguous even if another session wrote in
   between, and the FDE never types or sequences one.

   An accept that cites an id which does not exist is **refused whole**. A
   partial accept would leave the register in a state nobody chose.

**What the agent must not do:** invent a frequency, guess a rule holder, assign
its own ids, or upgrade a confidence class. Anything it cannot source goes to
`open-questions.md` as a `Q-` — that is the material `/next` will ask about.
