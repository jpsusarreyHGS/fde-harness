---
name: observation-protocol
description: How to run field observation on an FDE engagement — shadowing discipline, the four behavioural tells as countable signals, timestamped capture format, exception elicitation, and why the stated workflow is reliably not the real one. Read before any shadowing session, capture structuring, or current-state mapping. Supporting files carry the tell definitions and the capture formats.
---

# Observation protocol

## The premise

**The stated version of a workflow is reliably not the real one.** Not because people lie, but because the parts that make a job hard are the parts nobody counts: the exception nobody logs, the routing rule that lives in one analyst's head, the four-minute wait that has been there so long it stopped registering as a wait.

Interviews capture what someone believes about their work. Documentation captures what someone once decided the work should be. Only observation captures the work.

So the ordering is not negotiable: **observe first, corroborate second.** Transcripts, SOPs and interviews are supporting evidence. They are never the primary source, and a current-state map built from them will look complete and be wrong in exactly the places that matter.

## Evidence classes

Classify every input before you use it. See `capture-formats.md` for the log shapes.

| Class | What it is | Weight |
|---|---|---|
| **Observed** | An FDE watched it happen | Primary. Can source a requirement alone. |
| **System** | Log, export, record, config | Primary for volume and frequency; silent on intent. |
| **Documented** | Policy, SOP, runbook, spec | Aspirational until observed. |
| **Stated** | Interview, meeting, transcript, email | Corroborating only. |

**A requirement sourced only from Stated evidence is labelled `UNVERIFIED`.** A documented-versus-observed contradiction is a finding, logged with both source ids — not something the analyst quietly resolves.

## The four tells

Four signals mark where automation value sits. `the-four-tells.md` defines each one and how to count it. The discipline is that they are **counted, not noticed**:

1. **Repeated task** — the same action, more than once, by the same person or across people
2. **Copy-paste between systems** — a human acting as an integration
3. **Tool or tab switching** — context assembled by hand because no system holds it
4. **Dead time mid-workflow** — waiting on a person, a batch, or an approval

A tell you noticed is an anecdote. A tell you counted is a business case. "The analyst switches between four systems per case, eleven times per case, averaging 90 seconds per switch" survives a steering meeting; "there's a lot of tool switching" does not.

## Running a session

**Before.** Evidence-handling terms settled and signed (`evidence-handling` skill). Operator knows what you are doing and why. You are watching a normal day, not a demo — a walkthrough prepared for you is Stated evidence wearing Observed clothing.

**During.** Capture events, not summaries. One row per action, timestamped, with the system and what interrupted it. Resist structuring while you watch; the raw sequence is what reveals the loops, and summarising in the moment destroys the evidence you came for.

Ask "what happens when that isn't true?" every time you see a decision. That question is the single highest-yield thing you can say in the field, and it is how the exception register gets built.

**After.** Structure within the session, while you can still ask. A capture you structure a week later is a capture with holes you can no longer fill.

## Eliciting the undocumented rule

The most valuable thing in an engagement is the rule that lives in one person's head. It is also the hardest to get, for a reason worth understanding: **the person holding it often stopped mentioning it because nobody listened the last time.**

What works:

- Watch for a decision made faster than the stated criteria would allow. That gap is a heuristic.
- Ask about the last hard case, not the general policy. People narrate specifics accurately and generalise badly.
- Ask who they check with when they are unsure. That names the real authority, which is frequently not the org chart's.
- **Capture the rule verbatim before paraphrasing it.** Your paraphrase will smooth off the conditions that make it correct.

Every rule you capture becomes a validation shape and an eval case. This is why the exception register is a first-class store rather than a column on a process map.

## A caution on tooling

Process mining, session replay and workflow capture are good enough now that they can make sitting beside the operator feel optional. It is not.

Process mining tells you a variant fires 8% of the time. It does not tell you the analyst has a rule in her head for which of those cases go to a specific vendor, and it will never tell you she has stopped mentioning it. **Use the tools to find where to look, then go and look.**
