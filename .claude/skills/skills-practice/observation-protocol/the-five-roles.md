# The five roles

Every engagement needs these five. Recorded in `01-Organisation/stakeholder-map.md`.

| Role | What they give you | How to find them |
|---|---|---|
| **Executive sponsor** | Budget, mandate, the definition of success that will actually be judged | They initiated the engagement. **Confirm they control the budget — often they don't** |
| **Process owner** | The official version of the workflow and the authority to change it | Ask the sponsor: "who owns this end to end?" **If nobody does, that is your first finding** |
| **The operator** | The real workflow, including everything undocumented | Ask the process owner who actually does the work every day. **Then go sit with them** |
| **The exception holder** | The routing rules that exist in exactly one person's head | Ask: "when it's ambiguous, who decides?" **That name is the most valuable one you'll get** |
| **The systems gatekeeper** | Access, data, integration reality, what is immovable | Usually IT or platform. **Engage early — access latency is the top schedule risk** |

An unnamed role is an open question, not a blank cell.

## Questions for the sponsor

| Question | What you are listening for |
|---|---|
| What are you trying to accomplish? | The goal, not the artefact. Whether they can state an outcome without describing a feature |
| What happens after you have the solution? | If they can't answer, **the request is a proxy for something else** and you need to find out what |
| How is this being solved today? | There is always a current solution, even if it's a spreadsheet and someone's memory |
| What happens if we do nothing? | Separates real urgency from ambient AI pressure. Frequently surfaces the actual fear |
| Who else can do this work? | **Key-person risk masquerades as an efficiency request** more often than you'd expect |
| What have you already committed to, and to whom? | You need to know what promise you're standing inside before recommending a timeline |
| What would make this a failure even if the technology worked? | Surfaces political constraints nobody would volunteer |

**Record the sponsor's success sentence verbatim** in `01-Organisation/sponsor-brief.md`. A G1 criterion is being able to state their real problem in one sentence **that is not the thing they asked for** — and you can only do that if you have their actual words to work from.

## Questions for the operator

Ask about specifics, never generalities. "Walk me through the last one that was hard" beats "how do you handle exceptions."

- What did you do first this morning, and why that?
- When was the last time this went wrong? What happened?
- What do you check before you commit to that?
- Who do you ask when you're not sure?
- What would you do if the system let you?
- What's the part of this job you'd hand to someone else tomorrow?

That last one names the automation candidate more reliably than any framework, because the operator has already done the analysis.

## What to watch for, not ask about

Some things you will only get by watching:

- Where they hesitate before acting — an undocumented check
- What they have open that they never mention — the real system of record
- Which steps they do out of order — the documented order may be wrong
- What they redo — a quality problem nobody logs
- Where they stop to wait — dead time, invisible in every metric the client has

## Decision rights

Record who signs off what, in order, with typical latency. **A path with an unnamed step will stall at that step**, and you will not find out until it stalls. Decision rights must be *defensible* at G1 — meaning you could state them to the sponsor and they would agree.
