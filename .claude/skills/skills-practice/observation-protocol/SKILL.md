---
name: observation-protocol
description: Stages 01-02 — mapping the organisation and gathering the real workflow. Shadowing discipline, the five roles, the four behavioural tells as countable signals, and why the stated workflow is reliably not the real one. Read before any shadowing session, capture structuring, or operating map work. Supporting files carry the operating map's nine elements, the five roles with their questions, the tell definitions and the capture formats.
---

# Observation protocol

## The premise

**The stated version of a workflow is reliably not the real one.** Not because people lie, but because the parts that make a job hard are the parts nobody counts: the exception nobody logs, the routing rule in one analyst's head, the four-minute wait that has been there so long it stopped registering as a wait.

**A one-hour meeting gets you what someone thinks their job is. Eight hours beside them gets you the job.**

So the ordering is not negotiable: **observe first, corroborate second.** Transcripts, SOPs and interviews are supporting evidence, never the primary source. A map built from them will look complete and be wrong in exactly the places that matter.

**Your badge on site and your contractor email address are your data-mining permits.** Use them.

## "An email arrives" is never one step

The single most common discovery failure is accepting a step at the granularity the client describes it.

"An email arrives" is: which mailbox, from how many senders, in how many formats, with attachments in what state, routed by what rule, read by whom, and what happens to the ones that do not match. That is six to ten steps, several branches, and usually two exceptions nobody mentioned.

**Decompose every step until each one has a single actor, a single system, and a single outcome.** Where you cannot, you have found a judgement point — record it as one.

## Evidence classes

Classify every input before you use it. The class changes how much weight it carries.

| Class | What it is | Weight |
|---|---|---|
| **Observed** | An FDE watched it happen | Primary. Can source a requirement alone |
| **System** | Log, export, record, config | Primary for volume and frequency; silent on intent |
| **Documented** | Policy, SOP, runbook, spec | Aspirational until observed |
| **Stated** | Interview, meeting, transcript, email | Corroborating only |

**A requirement sourced only from Stated evidence is labelled `UNVERIFIED`.** A documented-versus-observed contradiction is a **finding**, logged with both source ids — not something the analyst quietly resolves. The gap between the SOP and the floor is frequently where the whole opportunity lives.

## The five roles

`the-five-roles.md` carries each role, what it gives you, how to find it, and the questions to ask. In summary: **executive sponsor** (budget, mandate, the definition of success that will actually be judged), **process owner** (the official workflow and authority to change it), **the operator** (the real workflow, including everything undocumented), **the exception holder** (the routing rules in exactly one person's head — *the most valuable name you will get*), **the systems gatekeeper** (access, data, integration reality — *engage early, access latency is the top schedule risk*).

If nobody owns the process end to end, **that is your first finding.**

## The four tells

Four countable signals mark where value sits. `the-four-tells.md` defines each and how to count it. The discipline is that they are **counted, not noticed**:

1. **Repeated task** — the same action more than once
2. **Copy-paste between systems** — a human acting as an integration
3. **Tool or tab switching** — context assembled by hand because no system holds it
4. **Dead time mid-workflow** — waiting on a person, a batch, or an approval

A tell you noticed is an anecdote. A tell you counted is a business case. "Four systems per case, eleven switches, 90 seconds each" survives a steering meeting; "there's a lot of tool switching" does not.

## The operating map

**Discovery ends with a document, not a conversation.** `operating-map.md` carries the nine elements every in-scope workflow must record — including the two most often skipped, **dead ends** and **failure modes**.

## Running a session

**Before.** Evidence-handling terms signed. The operator knows what you are doing and why. You are watching a normal day, not a demo — a walkthrough prepared for you is Stated evidence wearing Observed clothing.

**During.** Capture events, not summaries. One row per action, timestamped, with the system and what interrupted it. Resist structuring while you watch; the raw sequence is what reveals the loops.

Ask **"what happens when that isn't true?"** at every decision. It is the highest-yield sentence available in the field, and it is how the exception register gets built.

**After.** Structure within the session, while you can still ask. A capture structured a week later has holes you can no longer fill.

## Eliciting the undocumented rule

The most valuable thing in an engagement is the rule that lives in one person's head — and it is hardest to get for a specific reason: **the holder often stopped mentioning it because nobody listened the last time.**

What works:

- Watch for a decision made **faster than the stated criteria would allow**. That gap is a heuristic.
- Ask about **the last hard case**, not the general policy. People narrate specifics accurately and generalise badly.
- Ask **who they check with when unsure**. That names the real authority, frequently not the org chart's.
- **Capture the rule verbatim before paraphrasing.** Your paraphrase smooths off the conditions that make it correct.

Every rule captured becomes a validation constraint and a golden case.

**Protect the holder.** The rule exists because the official process is inadequate, so surfacing it can look like surfacing a workaround they are responsible for. Frame it as a process finding, never as individual behaviour.

## A caution on tooling

Process mining, session replay and workflow capture are good enough now that they can make sitting beside the operator feel optional. **It is not.**

Process mining tells you a variant fires 8% of the time. It does not tell you the analyst has a rule in her head for which of those cases go to a specific vendor, and it will never tell you she has stopped mentioning it. **Use the tools to find where to look. Then go and look.**
