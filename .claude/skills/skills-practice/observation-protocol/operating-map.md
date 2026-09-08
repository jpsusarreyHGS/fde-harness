# The operating map

**Discovery ends with a document, not a conversation.** For each workflow in scope, record all nine elements. Written to `02-Workflow/operating-map.md`.

| Element | What to record |
|---|---|
| **Trigger** | What starts it, **in all its real variants** — every format, sender, channel |
| **Steps** | Every step **including the ones nobody counts**. Who does it, in which system, how long it takes |
| **Volume & frequency** | Per day, week, month. **Peaks.** This is the input to prioritisation **and** to ROI |
| **Judgement points** | Where a human decides something that is not a rule — **usually far fewer steps than expected** |
| **Exceptions** | Every deviation, its frequency, and how it is handled today. **The long tail, not the happy path** |
| **Undocumented knowledge** | What lives only in someone's head, **and whose head** |
| **Dead ends** | Outputs nobody consumes. Reports nobody opens. Steps that persist for historical reasons |
| **Failure modes** | What breaks, how often, **who notices, who gets blamed**, what the recovery is |
| **Systems touched** | Every application, **in order**, with how data moves between them |

## The two that get skipped

**Dead ends** and **failure modes** are the elements most often missing, and they are disproportionately valuable.

### Dead ends

A step that produces something nobody consumes is free savings and zero risk — the easiest recommendation in any engagement, and it builds credibility for the harder ones.

How to find them: for every output, ask **who reads this, and what do they do differently because of it?** If the answer is vague, ask the named recipient directly. Reports that exist because someone once asked for them in a meeting are extremely common.

Record: the output, who produces it, the effort, who is *believed* to consume it, and what you actually confirmed.

**Do not recommend removal without confirming the consumer.** The one person who does rely on it will surface at the worst moment.

### Failure modes

Four questions per failure, and the third and fourth are the ones people omit:

- **What breaks?**
- **How often?**
- **Who notices** — and how long after it happened?
- **Who gets blamed?** And what is the recovery?

*Who gets blamed* is not organisational gossip. It tells you where the real pressure sits, which failures are politically expensive, and therefore which ones the client will actually pay to prevent. A failure nobody notices for a week is a different design problem from one that pages someone immediately.

Record the recovery path too. If recovery is manual and undocumented, that is both a risk and often a better first automation target than the happy path.

## Judgement points

Expect **far fewer than the client describes.** People characterise their work as judgement-heavy because the judgement is the memorable part, but most steps are deterministic lookups with a documented rule.

For each candidate: is there a rule? Is it written down? Does the operator apply it consistently? If there is a rule and it is applied consistently, it is deterministic — however much it feels like judgement.

This element feeds the allocation grid directly, and getting it wrong in the generous direction is how a project ends up using a model for a lookup table.

## Marking verification

Where an element is supported only by Stated evidence, mark it **`[STATED — unverified]` in the map itself**, not in a footnote. A reader must be able to see at a glance which parts were watched and which were described.

## Volume

**Never record a frequency without its window.** "Frequently" is not a frequency. If you do not have a count or a rate, write `unquantified` and raise a `Q-` — you cannot prioritise a workflow whose volume you do not know, and you cannot compute its ROI at all.
