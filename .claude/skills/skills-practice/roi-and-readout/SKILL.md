---
name: roi-and-readout
description: Stage 08 — calculating the ROI and presenting it. The nine model inputs and four outputs, why baselines must be captured while the current state is still observable, counter-metrics, attribution, and the four rules for the executive readout. Read before building the ROI model or preparing a client presentation.
---

# ROI and the readout

## The model

Nine inputs, four outputs, into `08-ROI/roi-model.md`. Every input comes from the operating map.

**Inputs**

| # | Input | Source | Rule |
|---|---|---|---|
| 1 | Instances per month | Operating map, volume element | Note peaks separately |
| 2 | Minutes per instance (today) | Observation log, **measured** | Observed, not estimated. Say how much is waiting |
| 3 | % handled without a human | Eval results + allocation grid | The realistic figure at the current rung, not the target |
| 4 | Loaded hourly cost | Client HR or finance | Loaded, not salary. State any multiplier you applied |
| 5 | Error rate today (%) | Readiness scorecard, measured | If client-reported and unvalidated, label it |
| 6 | Error rate after (%) | Eval results | From the four tests, not from hope |
| 7 | Cost per error | Client | Include rework, not just the direct cost |
| 8 | Build cost (one-off) | Actuals | Actual effort, not the estimate |
| 9 | Run cost per month | Cost envelope | Inference, compute, storage, connector calls, **and human-gate load** |

**Outputs**

- Hours recovered per month
- Net benefit per month
- Payback period
- Year-one net

**Use conservative inputs.** A defensible number beats an impressive one — the impressive one gets challenged, and then the whole model is in question rather than one line of it.

## Capture the baseline while it is still observable

This is the most time-sensitive instruction in the whole harness. **After the build, the "before" number is gone** and the business case becomes an argument you cannot win.

So inputs 1, 2, 5 and 7 are captured in stage 04 into `04-Placement/value-hypothesis.md`, and stage 08 populates the model with **actuals measured against them**. A G3 criterion is a *measured* outcome, not a projected one.

Record how each baseline was measured: method, sample, window, date, and the `EV-` ids behind it. A client-reported baseline nobody validated is not a baseline — say which is which.

## Counter-metrics

State what must **not** get worse. A pilot that improves throughput and quietly degrades quality has not succeeded, and without a counter-metric nobody notices until a customer does.

Per counter-metric: baseline, acceptable floor, and an owner.

## Attribution

How you will show this pilot caused the change rather than something else that happened that quarter. Agree it with the sponsor **before** the measurement window, not after.

| Basis | When it applies |
|---|---|
| Shadow-mode agreement | Strongest available — same traffic, same period, both sides logged |
| Control group | Where a comparable cohort exists and the client will accept the split |
| Before / after | Weakest. Name the confounders explicitly, including anything else that shipped that quarter |

## The readout

Four rules, in order of how often they are broken.

**1. Lead with the outcome, not the architecture.** The recommendation goes in the first ninety seconds. Nobody in the room wants the method first.

**2. Show the arithmetic.** The first question will be where the number came from. Have the chain ready: *this change reduces X, which moves Y, which is worth Z.* Each link traceable to an artefact.

**3. Name a risk before you are asked.** Volunteering the downside is the fastest way to make the upside credible. Pick a real one — a named risk nobody could have found is theatre.

**4. Give the sponsor their sentence.** They will have to repeat this upward, probably without you in the room. **Write it for them**, one sentence, in their vocabulary, and check they will actually say it.

Write to `08-ROI/executive-readout.md` and render to `deliverables/<slug>/08-ROI/`.

## Honesty rules

- **Never present a projected figure as measured.** Label every number as measured, modelled or assumed.
- **Never drop the counter-metrics from the readout** because they are unflattering. Their absence is what a sceptical CFO will look for.
- **Never round in your favour.** One inflated line discredits the whole model, and the model is the artefact the renewal rests on.
