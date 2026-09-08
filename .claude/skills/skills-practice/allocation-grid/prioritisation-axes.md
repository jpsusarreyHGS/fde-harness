# Prioritisation axes

Two axes. Rank candidates, take the top-right quadrant first, and deliver the whole matrix — including the bottom-left — to the client.

## Axis one — value at stake

```
value = volume × time per instance × loaded cost
        + risk effect + revenue effect
```

Every input comes from the operating map, which is why the map's **volume and frequency** element is load-bearing for both this and the ROI model.

| Input | Source | Rule |
|---|---|---|
| Volume | Operating map, volume element | Instances per month. Note peaks separately — a workflow that is trivial on average and brutal at month-end is a different problem |
| Time per instance | Observation log, measured | Use observed seconds, not estimates. Include the waiting, and say how much of the elapsed time is waiting |
| Loaded cost | Client HR or finance | Loaded, not salary. If you only have salary, say so and apply a stated multiplier |
| Risk effect | Readiness scorecard, RAID | Error rate today × cost per error |
| Revenue effect | Sponsor | Only where the client will stand behind the attribution |

**Use conservative inputs.** A defensible number beats an impressive one, because the impressive one gets challenged and then the whole matrix is in question.

## Axis two — feasibility

Five factors. Score them, then take the **lowest**, not the average — feasibility is a chain and it breaks at its weakest link.

| Factor | What kills it |
|---|---|
| **Data availability** | The data does not exist, or exists only in a system nobody can extract from |
| **API coverage** | Documented coverage and real coverage differ. Score what you verified, not what the docs claim |
| **Verifiability** | If you cannot tell whether the output is right, you cannot eval it, and you cannot ship it past shadow mode |
| **Exception density** | A workflow that is 60% exceptions is not a workflow with exceptions, it is a judgement task wearing a process costume |
| **Political resistance** | The step whose owner does not want it automated. Real, common, and fatal if unrecorded |

**Access latency is the top schedule risk.** "Possible" is not "agreed", and "agreed" is not "provisioned". Score provisioned.

## The matrix

| | Low feasibility | High feasibility |
|---|---|---|
| **High value** | Fix the blocker first — name it and its owner | **Start here** |
| **Low value** | Decline, and argue it | Quick win if genuinely quick; otherwise a distraction |

## Delivering it

The matrix goes to the client **with the declines included and argued**. Three rules from the runbook's readout guidance apply here too:

- **Show the arithmetic.** The first question will be where the number came from. Have the chain ready: this change reduces X, which moves Y, which is worth Z.
- **Name a risk before you are asked.** Volunteering the downside is the fastest way to make the upside credible.
- **Give the sponsor their sentence.** They have to repeat this upward. Write it for them.
