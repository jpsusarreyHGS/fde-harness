# Conformance

**What the harness implements, what it extends, and what it knowingly diverges on.**

`CLAUDE.md` says the canon wins and a divergence is a defect to report. That rule was unfalsifiable until now: neither document was in the repo, so nobody cloning it could check. Both are vendored in [`canon/`](canon/), and this file is the report.

## Who owns what

| Source | Owns | Do not cite it for |
|---|---|---|
| [`canon/fde-engagement-runbook.html`](canon/fde-engagement-runbook.html) | The ten stages and their outputs. Every named framework | **Gates.** It has none |
| [`canon/fde-bootcamp-complete.html`](canon/fde-bootcamp-complete.html) | The three gate bars, the five certified behaviours, the certification outcomes | The stage sequence |
| [`canon/fde-platform-tooling-map.html`](canon/fde-platform-tooling-map.html) | 91 tool components in eight groups, with tiers and a build order | Method |

## Implemented, and faithful

Verified line by line against the runbook.

- **The ten stage names** — verbatim, in order, ten for ten (`packages/derive/src/instruments.ts`).
- **The operating map's nine elements** — all nine, with the runbook's own gloss.
- **The five roles** and the seven sponsor questions — transcribed one for one.
- **The allocation grid's four quadrants** — verbatim, including *"Default here"* on deterministic and *"a legitimate and frequently correct answer"* on leave-alone.
- **Two-axis prioritisation** — both axes, all five feasibility factors, plus the decline mandate.
- **The four tests** — verbatim, including *"that routing is a design outcome, not a failure"*. The eval report format is reproduced character for character.
- **The autonomy ladder** — five rungs with their exit criteria, correctly split into what the system does and what earns the next rung.
- **The ROI model** — nine inputs and four outputs, same labels, same order.
- **"Eight hours beside them gets you the job"** — the runbook's only quantified timebox, carried in four places.

## Extensions

Not in any canon document. Listed because the README used to print *"straight from the runbook, not invented"* close enough to them to blur the line.

| Extension | Why |
|---|---|
| The evidence-class system — observed / system / documented / stated, with the class set by the folder | Operationalises the runbook's *"customers describe solutions, not problems"*. The four-class taxonomy is ours |
| `evidence-handling-terms` and the capture hard-stop | The canon says nothing about data protection, employee monitoring or consent. A hard stop on a requirement no document imposes — deliberate, and worth knowing |
| The intake loop — `/capture`, proposals, code-minted ids | No canon id scheme, no accept/reject workflow |
| The coach (`/next`) | See *Knowingly divergent* below |
| The ontology contract layer — ten of 41 instruments | The runbook's stage 03 asks for a systems inventory and a vocabulary audit and stops there. The largest single extension, and the one most likely to be mistaken for method |
| Engagement management — roadmap, RAID, scope changes, charter | Standard delivery furniture. `RAID`, `roadmap` and `charter` appear nowhere in the canon |
| **The pre-engagement layer** — `engagement-mandate.md`, `entry-hypotheses.md`, `00-Setup/agreement/` | The runbook asserts stage 00 *"converts an open-ended AI conversation into a bounded piece of work with a deliverable"* and then never names the artefact carrying that boundary, never says who writes it, and never tells the FDE to read it. Its two nearest sponsor questions recover the prior commitment **by asking in an interview**. So the harness now records what was sold, and the shape comes from the bootcamp's Day 1 deliverable — *"three hypotheses about what [the client] actually needs, and the evidence you'd want before believing any of them"* — which had no instrument |

## Knowingly divergent

Each of these is a decision, not an oversight. Change the harness or amend the document — but do not leave it silent.

**`/next` decides what to ask.** The tooling map specifies the open-question queue as *"Advisory — it proposes questions, **it does not decide what to ask next**."* `/next` ranks, names a person and says what each question blocks. It defends itself by showing its reasoning on every item and by splitting `ask` from `fix` so the queue never contains items nobody can answer. **We think the tool is better than the spec. The map should be amended.**

**The fourth behavioural tell.** The canon's tell is *"phone comes out mid-workflow… also visible exasperation, and the phrase 'well, I* have *to'"* — things you catch across a desk. The harness's is *"dead time mid-workflow"*, a calculation. Better instrumented, and it drops the three named observables from a section headed *"what to watch for, not ask about"*. Worth restoring the observables alongside the measure.

**G3 is not the capstone bar.** The bootcamp's third bar certifies a *person*: the judgment chain, the five behaviours, the product return. The harness's G3 assessed a *system's* production readiness. Partially reconciled — the judgment chain and the behaviours are now G3 criteria — but the certification outcomes (Pass / Conditional / Redirect) have no analogue.

## Known gaps

Ranked by how load-bearing the canon makes them.

| Gap | Canon says |
|---|---|
| **Shadow-mode comparison harness** | Tooling map, Tier 1: *"nothing off the shelf runs an agent alongside a human on live traffic, logs both, and computes agreement. **That one is ours.**"* **Partly closed** — the ledger now records agreement by exception class and the harness derives clustered-vs-scattered from the counts rather than asking someone to type the word. **The runtime half is still absent**: nothing runs the agent alongside the human. The numbers still arrive by hand; only the judgement on them is computed |
| **The sponsor de-risking pillar** | Runbook stage 00: never open with migration; give them a sentence they can repeat upward; consider a discounted first assessment; *"they do not want to get fired, they want to get promoted"*. **Partly closed** — `mandate.promised` records what was promised and to whom. Still missing: the narrative sentence the sponsor repeats upward, and the migration rule |
| **Model economics** | Runbook: *"Start on a frontier model… then work down. This is the difference between a pilot that scales and one that dies at the budget review."* No tiering field anywhere |
| **The MVP bar** | Runbook: *"the bar is that it completes the task **when prompted badly**… If it only works in your hands, you haven't built anything."* G2 substitutes a held-out-slice threshold, which is weaker |
| **Five of seven build-anatomy components** | Runbook stage 05 requires guardrails *"enforced in code, not in the prompt"*, structured output, deliberate context and memory, and failure handling. Only the audit trail is enforced |
| **Four of eight operator questions** | Including the two the runbook rates highest: *"What's the most annoying part of your morning?"* and *"What do you ignore, and why?"* — *"that filter is business logic"* |
| **The seven-layer systems taxonomy** | Runbook stage 03, with its targeting advice: *"Spend & ops… often the best MVP target"* |
| **The naming rule** | Runbook: *"Buyers have an allergic reaction to the word **audit**… Sell the identical work as an assessment sprint."* The harness uses the forbidden word in its own prose |
| **The fifth readout rule** | *"Rehearse it twice. Once as the engineer. Once as the VP. They are different talks."* The harness counts five as four |
| **The 90-day library clock** | Bootcamp: *"at least one generalised asset shipped back within 90 days of engagement start… the practice measures it"* |

## Against the tooling map

Roughly **13–16 of 91** components, and **10 of 44 Tier-1**. The map's stated build order is *"Groups 0, 1 and 2 at Tier 1"* first — *"these three make a single engagement deliverable and defensible."*

| Group | State |
|---|---|
| 0 — Discovery workspace | **Deep.** The harness's centre of gravity |
| 1 — Agent harness and runtime | **Absent.** Claude Code is the runtime; the harness owns no registry, router, orchestrator or approval console |
| 2 — Observability and audit | **One component, done well** — the requirement traceability map is `chain.ts`. The other nine are absent |
| 3 — Eval platform | **One component** — the ontology validation suite. The golden-set manager and every evaluator are absent |
| 4 — Connectors | **One, narrow** — document conversion |
| 5 — Ontology | **The contract layer, and an external compiler.** Entity resolution and inference are absent |
| 6 — Deployment substrate | **Absent**, which the map endorses for ten of eleven — except the shadow-mode harness, which it says is ours |
| 7 — Pattern library | **Good.** Skills, templates, agents, and the boundary rule implemented literally |

The honest read: the harness is an excellent Group 0 and Group 7, and the map's first tranche is two-thirds unbuilt.

## Closed since the audit

| Was | Now |
|---|---|
| The four tells were never counted, though the template said *"do not maintain by hand"* | Derived, with the observation window beside them |
| The ROI arithmetic existed nowhere, though `/roi` promised to show it | `cli.ts roi` computes all four from the nine inputs and prints the working. A missing input yields no output rather than a zero; an error rate that rose contributes nothing rather than netting off |
| **The three buckets had no home**, and revenue uplift no line at all | A labels table on the ROI model, and `/roi` exits non-zero while any bucket is unaddressed |
| G3 omitted the judgment chain and the five behaviours | Both are G3 criteria |
| Gate caveats were written into a register nothing could see | The three gate memos are registered instruments |
| The scope every change was judged against was a line typed from memory | `SCOPE_SOURCE` is recorded on the charter, and an unsourced one raises a `Q-` against the sponsor |
| Neither canon document was in the repo | `docs/canon/`, with this file as the report |

## Keeping this true

`harness-improver` reads this file before proposing a change to any skill, template or instrument, and reports a new divergence rather than absorbing it. A divergence that is not written down here is a defect; one that is written down is a decision.
