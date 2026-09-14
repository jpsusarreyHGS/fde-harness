---
description: Stage 08. Invoke the engagement-manager in roi mode to populate the engagement ROI model with actuals against the stage-04 baseline, and draft the executive readout. Nine inputs, four outputs, plus counter-metrics and an agreed attribution basis.
allowed-tools: Read Write Glob Grep Bash Agent
---

Use the Agent tool to dispatch the `engagement-manager` agent in **`roi` mode**. It loads `skills-practice/roi-and-readout`.

1. **Populates the nine inputs** from the operating map and eval results, labelling each as **measured, modelled or assumed**. An unlabelled figure will be read as measured.
2. **Does not compute the four outputs by hand.** Code does, from the nine inputs, and prints the working with the numbers substituted:

   ```bash
   node packages/derive/src/cli.ts roi engagements/<slug>
   ```

   A missing input produces **no output**, never a zero that reads as a result. An error rate that got *worse* contributes nothing rather than netting off against the benefit — that is a counter-metric finding, and the model must not absorb it. A system that does not pay back says so instead of printing a large number of months.

   Paste the output into the `Arithmetic` column. *"Show the arithmetic. The first question will be where the number came from"* — and a figure somebody typed cannot answer that question.
3. **Compares to the stage-04 baseline.** A G3 criterion is a *measured* outcome, not a projected one. If the baseline was never captured, say so plainly — that is a finding, and it is why stage 04 captures baselines while the current state is still observable.
4. **Fills all three buckets.** *"There are exactly three buckets a business cares about"* — cost savings, revenue uplift, risk mitigation — *"and every deployed system should be measured against all three."* Revenue uplift is the one most often left blank and the one the sponsor is most often judged on. A bucket that genuinely does not apply gets a reason in the `Effect` cell; a blank cell is not an answer.
5. **Records counter-metrics** — what must not get worse. A pilot that improves throughput and quietly degrades quality has not succeeded, and their absence from a readout is what a sceptical CFO looks for.
6. **Confirms the attribution basis** was agreed with the sponsor *before* the measurement window.
7. **Drafts the readout** against the four rules: lead with the outcome not the architecture · show the arithmetic · name a risk before being asked · **give the sponsor their sentence**, written for them in their vocabulary.

Outputs: `08-ROI/roi-model.md`, `08-ROI/executive-readout.md`.

**Use conservative inputs.** A defensible number beats an impressive one — the impressive one gets challenged, and then the whole model is in question rather than one line of it.
