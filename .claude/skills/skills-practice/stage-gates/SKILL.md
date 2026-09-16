---
name: stage-gates
description: The three engagement gates and their criteria, taken from the bootcamp's Week 1, Week 2 and capstone bars. G1 discovery (03 to 04), G2 build (06 to 07), G3 production (08 to 09). Read before producing or reviewing a gate readiness memo, or when asked whether a stage is complete.
---

# Stage gates

Three gates, from the bootcamp's Week 1, Week 2 and capstone bars. **The runbook has no gates** — it names no decision point other than the autonomy ladder's per-rung exit criteria, so do not cite it for these. Each is a **stop**, not a status update. `engagement-manager` produces the memo; **the operator decides.** Nothing in this skill makes the decision.

**Machine-derivable status only.** A gate may be computed to `ready`. Only a person sets `passed`, with a `decidedBy`. Code never sets `passed`.

---

## G1 — Discovery (stage `03` → `04`)

The bootcamp's Week 1 bar. Three artefacts at standard, plus behaviours observed.

| Criterion | Standard |
|---|---|
| **Operating map + exception inventory** | All nine map elements populated, exceptions with frequency and rule holder. Scored against reality, not completeness of the template |
| **Stakeholder map + readiness scorecard** | **Five roles identified correctly**, decision rights defensible, and **the data landmines found** |
| **Draft ontology** | **Canonical grain chosen and defended.** Grain mismatches between source systems identified as the cause of whatever breaks weekly |
| **Evidence-handling terms** | Signed. Six terms agreed, monitoring constraint checked against jurisdiction and labour representation |
| **Entry hypotheses closed** | Each of the three supported or disproved, with the evidence named. They were written before anything was watched and are expected to be wrong — the bar is that we say which, not that we were right |

**Behaviours to confirm, not just artefacts:**

- Chose **observation over interview**, unprompted, at least once
- **Treated resistance as information** — went and watched instead of persuading
- **Correctly identified at least one thing that should not be built**
- Can state the sponsor's real problem **in one sentence that is not the thing they asked for**

That last one is the sharpest test in the whole gate. A sponsor asks for a dashboard; the real problem is that nobody trusts the numbers. If the team can only restate the request, discovery has not happened yet.

**The failure mode:** an all-green memo on first pass. On a real engagement that almost always means it was written from intent rather than evidence. Re-check the readiness scorecard — "possible" is not "agreed" and "agreed" is not "provisioned."

---

## G2 — Build (stage `06` → `07`)

The bootcamp's Week 2 bar. Three headings, and the system runs live against a **held-out slice it has never seen**.

| Criterion | Standard |
|---|---|
| **The system works** | Completes the task on the held-out slice at the acceptance-criteria threshold, with **zero silent failures** — everything below confidence routes to the gate |
| **The evidence exists** | Eval report with a **failure taxonomy**; full audit trail demonstrable on **any run the reviewer picks**; **regression gate blocks a deliberately broken change** |
| **The judgment is defensible** | **Allocation grid survives challenge**; the **declines are argued convincingly**; the **cost envelope is arithmetic rather than hope** |

Three of these are actively adversarial and must be rehearsed, not assumed:

- *Any run the reviewer picks* — so the audit trail cannot have gaps
- *A deliberately broken change* — so the regression gate must have been seen to fail
- *Survives challenge* — so every allocation needs its written reason

**Behaviours:** shipped at least one thing in under a day and closed the loop with a real user · protected the pilot charter under scope pressure **without damaging the sponsor relationship** · made an explicit fold-in / discard call on every artefact.

---

## G3 — Production (stage `08` → `09`)

The capstone bar is three things, and the harness used to carry only one of
them. From the bootcamp, verbatim: **the judgment chain**, **the behaviours**,
**the product return**. What it tests is *"not whether the system is
impressive — whether the judgment chain holds… A modest system with an intact
chain passes; an impressive demo with a broken chain does not."*

| Criterion | Standard |
|---|---|
| **The judgment chain holds** | Every claim traces to evidence: map → grid → spec → build → eval → claim. Any broken link is a specific, named gap. `cli.ts <dir> --audit` computes it; attach the output |
| **Library contribution** | At least one generalised asset accepted **by the library owner** |
| **Shadow mode passed** | Agreement met its stated threshold **and the disagreements are understood** — clustered or scattered, named either way |
| **UAT complete** | Client-led, against their own cases, with exit criteria agreed in advance |
| **Client review held** | The readout given, the arithmetic shown, a risk named before being asked |
| **A measured outcome** | Not projected. The ROI model populated with **actuals** against the baseline captured in stage 04 |
| **Fold-in or discard** | Called on **every** artefact, with a named date on each discard |
| **Named production owner** | Someone named owns it, and has accepted. The ladder's rung 5 requires it |

The first two are the capstone bar. The rest come from the Week 2 footer —
*"Week 3: deployment, adoption, value realisation"* — and belong here, but they
are not what the bootcamp certifies.

A measured outcome is also the only defence against the baseline having quietly
disappeared, which is why stage 04 captures it while the current state is still
observable.

### Behaviours

**The five the bootcamp certifies**, observed at least once across the
engagement. They sat in the stage-09 retrospective — written *after* the
decision they exist to inform.

| Behaviour |
|---|
| Chose observation over interview, unprompted |
| Declined an automation |
| Shipped a sub-day fix and closed the loop with a real user |
| **Held a position under authority pressure** |
| Made an explicit fold-in / discard call on every artefact — nothing labelled "temporary" |

The fourth has no other home in the harness, and a gate is the only honest
place to assess it.

---

## Writing the memo

Per criterion: **met / partial / unmet**, the evidence path, and where not met, what closes it and who owns that.

Three anti-patterns to check in your own draft:

- **All green on first pass** — re-read, and check the weakest criterion twice
- **"Partial" used as a soft pass** — it is only meaningful with a stated remainder and an owner; without those it is "unmet" with better manners
- **Evidence that points at a file rather than a fact** — "see requirements-register.md" is not evidence that acceptance criteria exist. Cite the rows

Then state plainly what the operator would be accepting, and who accepts it. After the decision, record it in `chronicle/memory/decisions.md` with the operator named.
