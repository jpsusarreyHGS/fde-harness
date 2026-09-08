# The four driving questions

Answer these in writing, per step. The written answer is what makes the grid defensible when it is challenged.

## 1. What is the blast radius when this is wrong?

**There is no context-free accuracy target.** 88% accuracy is excellent for suggesting a category a human confirms, and unacceptable for releasing a payment.

Record: what happens on a wrong output, who is affected, whether it is visible, whether it is reversible, and how long it takes to notice.

| Blast radius | Implication |
|---|---|
| Invisible and self-correcting | Model judgement is fine at modest accuracy |
| Visible internally, reversible | Model judgement with a human gate on the write |
| Customer-visible or financial | Human gate, and the gate is infrastructure not policy |
| Regulatory, safety, irreversible | Usually *leave alone*, or deterministic only |

## 2. Will I get a 2 a.m. phone call about this in six months?

**If yes, either do not ship it or ship it properly. There is no third option.**

The middle path — shipping it lightly and hoping — is how an FDE practice acquires an unfunded support obligation. Record who is on call, what the failure looks like at 2 a.m., and whether anyone would know it had failed.

## 3. Who owns this when I leave?

Client, another team, or another FDE. **Decide before you build, not after.**

An unnamed owner means the answer is "you, forever." Record the name, and record whether that person has agreed.

## 4. Is the volume high enough that improvement matters?

**A perfect fix to a twice-monthly task is a rounding error.** Prioritise high-volume workflows.

Record instances per month from the operating map's volume element. If it is unquantified, that is an open question, not a blank — you cannot place a step whose volume you do not know, and you certainly cannot compute its ROI.

## 5. What is the trade-off for solving this fast?

**Small wins with compounding negative consequences are a net loss you will pay for later.**

The classic case: a fast fix that bypasses a control, creates a shadow data path, or hard-codes a rule that was about to change. Record what the fast version would cost later, and whether the fold-in-or-discard call at ship time can realistically be honoured.

## Recording the answers

One row per step in `04-Placement/allocation-grid.md`, with the reason column carrying the substance. A grid whose reason column reads "makes sense" has not been done.

Where two questions point in different directions, say so and name the tension. A step with a high blast radius and high volume is exactly the interesting case, and averaging it into a single verdict destroys the finding.
