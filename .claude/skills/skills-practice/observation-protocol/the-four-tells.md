# The four tells

Four countable signals that mark where automation value sits. Each is recorded as an event in the observation log, not as a judgment in a report.

## 1. Repeated task

**Definition.** The same action performed more than once — by one person within a case, by one person across cases, or by several people doing the same thing separately.

**How to count.** Action, actor, occurrences observed, observation window. Derive a per-case or per-day rate; never report a raw count without its window.

**What it usually means.** Same action across people with no shared tool is a missing system. Same action repeatedly within one case is usually a system that will not hold state between steps.

## 2. Copy-paste between systems

**Definition.** A human moving data between two systems by hand — clipboard, retyping, or exporting and re-importing.

**How to count.** Source system, target system, field or payload, occurrences, time per occurrence.

**What it usually means.** A human acting as an integration. This is the highest-yield tell because it is unambiguous, easy to quantify, and points directly at a connector. It is also the one most likely to be dismissed by the person doing it as "just how it works".

**Watch for.** Transformation happening in the paste — reformatting a date, splitting a name, mapping one code to another. Undocumented transformation logic is a mapping rule you now have to capture, and it is exactly where silent data defects come from.

## 3. Tool or tab switching

**Definition.** Leaving the system of work to fetch or verify something elsewhere.

**How to count.** Switches per case, distinct systems touched per case, seconds per switch, and **what was being fetched**.

**What it usually means.** No single system holds the context the job needs, so a person assembles it. That assembled context is often the first honest sketch of the client's ontology — the entities a person pulls together to make a decision are the entities the model needs.

## 4. Dead time mid-workflow

**Definition.** Elapsed time where the case is open and nobody is working it — waiting on a person, a batch, an approval, or a system.

**How to count.** Wait start, wait end, what was being waited on, whether the operator was blocked or context-switched away.

**What it usually means.** Cycle time is mostly waiting, and waiting is usually invisible in whatever metrics the client already has. This tell frequently produces the largest number in the business case and the least resistance to it, because nobody is defending the queue.

**Watch for.** Waits so normalised the operator does not mention them. If a step "takes a day", ask how much of that day is work.

## Recording rules

- **A tell is an event with a timestamp**, not a rating.
- **Never report a count without its observation window.** "Eleven switches" is meaningless; "eleven switches per case across nine observed cases" is evidence.
- **Never aggregate across operators without saying so.** Variance between people is itself a finding — it usually means the process is undocumented, and the spread tells you how undocumented.
- **Cite the tell's `EV-` ids** in any requirement or business case that leans on it.
