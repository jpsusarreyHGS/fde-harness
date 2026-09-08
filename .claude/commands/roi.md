---
description: Stage 08. Invoke the engagement-manager in roi mode to populate the engagement ROI model with actuals against the stage-04 baseline, and draft the executive readout. Nine inputs, four outputs, plus counter-metrics and an agreed attribution basis.
allowed-tools: Read Write Glob Grep Agent
---

Use the Agent tool to dispatch the `engagement-manager` agent in **`roi` mode**. It loads `skills-practice/roi-and-readout`.

1. **Populates the nine inputs** from the operating map and eval results, labelling each as **measured, modelled or assumed**. An unlabelled figure will be read as measured.
2. **Computes the four outputs** — hours recovered per month, net benefit per month, payback period, year-one net — and shows the arithmetic for each.
3. **Compares to the stage-04 baseline.** A G3 criterion is a *measured* outcome, not a projected one. If the baseline was never captured, say so plainly — that is a finding, and it is why stage 04 captures baselines while the current state is still observable.
4. **Records counter-metrics** — what must not get worse. A pilot that improves throughput and quietly degrades quality has not succeeded, and their absence from a readout is what a sceptical CFO looks for.
5. **Confirms the attribution basis** was agreed with the sponsor *before* the measurement window.
6. **Drafts the readout** against the four rules: lead with the outcome not the architecture · show the arithmetic · name a risk before being asked · **give the sponsor their sentence**, written for them in their vocabulary.

Outputs: `08-ROI/roi-model.md`, `08-ROI/executive-readout.md`.

**Use conservative inputs.** A defensible number beats an impressive one — the impressive one gets challenged, and then the whole model is in question rather than one line of it.
