# HGS FDE harness

A Claude Code project harness implementing the HGS Forward Deployed Engineering practice method — the ten stages of the engagement runbook, with the artefacts that pass the bootcamp's gates. Both documents are vendored in [`docs/canon/`](docs/canon/).

**Where things stand:** [`docs/status.md`](docs/status.md) — what is ready, what is manual, what is missing, and what to do next.

**The canon is canon.** The runbook owns the stages and the frameworks; the bootcamp owns the gates and the certified behaviours; the tooling map is what the tooling is measured against. Where the harness and a canon document disagree, the document wins and the divergence is a defect to report. See [`docs/conformance.md`](docs/conformance.md) for what is implemented, what is extension, and what is knowingly divergent.

---

## Why this exists

**The gap.** Our FDEs are good at discovery — sitting with the client, mapping how the business actually works, capturing what people call things and what they ask every day. Right now that knowledge dies in documents. There is no clean path from *"we understand your business"* to *"your AI systems understand your business."*

That path is an **ontology**: the client's business, written down in a form software can use. Building one by hand, from scratch, every engagement, is the gap.

**The plan, in three pieces.**

**1. `fde-harness` captures discovery in a structured way.** Instead of loose notes and decks, discovery lands in six standard files: the client's vocabulary, who does what, the questions their people actually ask, what the AI is allowed to write, where the data lives, and the rules for what "clean" data looks like. **Every line traces back to evidence** — something we saw or someone said. No guessing.

**2. The `ontology-engineer` promotes those six files into a real model.** Deliberate, logged, human-approved. This is the quality gate: nothing enters the model that discovery did not earn.

**3. The ontology compiler turns that model into a working system** on whatever platform the client already runs. Same six files in; out comes a Databricks build or a Fabric build. **We do not pick the platform** — the client's estate and their questions pick it.

### Where each piece actually stands

Being precise about this matters more than the pitch, because an FDE picking this up needs to know which parts will carry weight today.

| Piece | State |
|---|---|
| **1 — capture** | **Built and in use.** Ten stages, 50 instrument templates, the evidence chain enforced in code, an intake loop that turns raw material into proposed rows, and a coach that tells you what to ask next |
| **2 — promote** | **Built as a discipline, not yet as automation.** `ontology-engineer` is the only agent permitted to write to an ontology repo, and every write is logged in `promotion-log.md` against the requirement that justified it. What is still manual is the modelling itself — a person reads the contract and builds the graph |
| **3 — compile** | **Built.** [`jpsusarreyHGS/ontology-compiler`](https://github.com/jpsusarreyHGS/ontology-compiler) reads an engagement's contract layer directly and emits a governed assistant. **Jena** and **Databricks** are stable; **Fabric** is configured in the instance file but not implemented — its own README says the first task there is research, not code |

### The contract layer

The handoff between discovery and the build. Every file is a **discovery deliverable filled from the field**, not a modelling artefact invented at a desk — that is the load-bearing idea in the whole method, and the reason the compiler can read it at all.

All of it lives in `engagements/<slug>/03-Systems/ontology/`, except the flows, which stay where they are written.

| In plain terms | File | Filled from | Required |
|---|---|---|---|
| The client's vocabulary | `glossary.md` | Terms captured verbatim during observation | **yes** |
| Who does what, and what they may change | `personas.md` | `01-Organisation/stakeholder-map.md` | **yes** |
| The questions their people actually ask | `competency-questions.md` | `02-Workflow/open-questions.md` and observed asks | **yes** |
| Where the data lives, and what mints each id | `source-systems.md` | `03-Systems/systems-inventory.md` | **yes** |
| The objects, and what "clean" looks like | `entities.md` | `02-Workflow/exception-register.md` | no |
| What the AI is allowed to do, end to end | `05-Build/spec.md` | `04-Placement/prioritisation.md` | no |
| What is waiting, and what was promoted | `backlog.md` · `promotion-log.md` | The promotion decisions themselves | no |

**`CQ-` and `WR-` ids are the join key.** A competency question numbered `CQ-01` here becomes `cq-01-<slug>` as a read template, a filename, a registry id and a coverage row in every target. Changing an id changes a filename in another repository — which is why code mints them and nobody types one.

**Competency questions are the acceptance test.** A question the model cannot answer is either a modelling gap or a data gap — and which one it is must be stated, because they have completely different remedies and completely different costs.

---

## The ten stages

| | Stage | Command |
|---|---|---|
| `00` | Before you land | `/init-engagement` |
| `01` | Map the organisation | `/capture` · `/discover` |
| `02` | Gather the real workflow | `/capture` · `/discover` |
| `03` | Analyse the systems | `/capture` · `/discover` · `/ontology` |
| | **G1 — Discovery gate** | `/gate 1` |
| `04` | Place the intelligence | `/allocate` |
| `05` | Build the MVP | `/architect` · `/build` |
| `06` | Prove it with evals | `/evaluate` |
| | **G2 — Build gate** | `/gate 2` |
| `07` | Ship into production | `/evaluate` |
| `08` | Calculate the ROI | `/roi` |
| | **G3 — Production gate** | `/gate 3` |
| `09` | Run the loop again | `/harness-improver close` |

Plus `/next` (the three conversations to have tomorrow, with names attached), `/sketch` (the pre-G1 alignment page — what we heard, not what we will build), `/mockup` (what it could look like, synthetic, assumptions listed), `/dashboard` (rebuild state and render the GUI), `/render` (client deliverables) and `/chronicle` (log the session).

**Not sure which command comes next? `/commands`.** It is the harness's `git --help`: every command in stage order with what it is for — read from the command files themselves, so it cannot go stale — and, for your engagement, *where you are* and the next one to three commands to run, each with the reason:

```
WHERE YOU ARE — caldera-logistics
  Discovery — 20 accepted row(s) across stages 01–03; G1 not yet assessed.

NEXT, IN ORDER
  /capture
      why: 5 file(s) in evidence/ no register has seen
  /next
      why: the conversations to have tomorrow, with names — and what is already on file to verify
```

(`/help` is Claude Code's own command and cannot be overridden, which is why this one is `/commands`.)

### What each stage needs before you can leave it

Two kinds of artefact. **Accepted rows** come out of `/capture` as proposed rows and become real when you `accept` — ids are minted then, and everything downstream cites them. **Written prose** is a file an agent drafts and you edit; nothing mints it. The gate memos say whether the bar is met; this table says what has to exist for the memo to have something to assess.

| Stage | Must exist to leave it | Path under `engagements/<slug>/` | Produced by | Kind |
|---|---|---|---|---|
| `00` | Mandate, entry hypotheses, evidence-handling terms **signed**, stack decision | `00-Setup/engagement-mandate.md` · `entry-hypotheses.md` · `evidence-handling-terms.md` · `stack-decision.md` | `/init-engagement` scaffolds; you fill before the first meeting | prose |
| `01` | The five roles named, decision rights defensible; the sponsor's sentence verbatim | `01-Organisation/stakeholder-map.md` · `sponsor-brief.md` | `/capture` (fills the roles and the sponsor's answers from interviews) · `/discover` | accepted rows (fills) |
| `02` | Observation log, operating map (nine elements), exception register with rule holders, requirements each with a `Source`, open questions | `02-Workflow/observation-log.md` · `operating-map.md` · `exception-register.md` · `requirements-register.md` · `open-questions.md` | `/capture` → `accept` · `/discover` for the map's prose · `answer` for what you were told | accepted rows |
| `03` | Systems inventory, readiness scorecard with blockers **and owners**, vocabulary audit; the ontology contract started | `03-Systems/systems-inventory.md` · `readiness-scorecard.md` · `vocabulary-audit.md` · `ontology/{glossary,personas,competency-questions,source-systems}.md` | `/capture` → `accept` · `/ontology` promotes into `ontology/` | accepted rows; ontology is prose + rows |
| **G1** | Memo: READY / READY WITH CAVEATS / NOT READY. A person decides | `engagement-management/stage-gate-1-readiness.md` | `/gate 1` | prose; you set the decision |
| `04` | Every map step in one of four quadrants **with a reason**; two-axis ranking **including the declines**; cost envelope; baselines | `04-Placement/allocation-grid.md` · `prioritisation.md` · `cost-envelope.md` · `value-hypothesis.md` | `/allocate` | rows (`AL-`) + prose |
| `05` | Architecture and diagram, access model, build plan, a working slice | `05-Build/architecture.md` · `architecture-diagram.md` · `access-model.md` · `builds/` | `/architect` · `/build` | prose + code |
| `06` | Golden sets from `EX-`/`CQ-` ids, a run, the eval report with a failure taxonomy, regression gate proven | `06-Evals/golden-sets/` · `runs/` · `eval-report.md` | `/evaluate` | rows + prose |
| **G2** | Memo, as G1 | `engagement-management/stage-gate-2-readiness.md` | `/gate 2` | prose |
| `07` | Autonomy ledger with **measured** agreement per rung, adoption, runbook, fold-in-or-discard on every artefact | `07-Production/autonomy-ledger.md` · `adoption.md` · `runbook.md` · `fold-in-or-discard.md` | `/evaluate` (measures) · you write the rest | rows + prose |
| `08` | ROI model, nine inputs each labelled measured / modelled / assumed; the executive readout | `08-ROI/roi-model.md` · `executive-readout.md` | `/roi` (code computes the four outputs) | rows + prose |
| **G3** | Memo, as G1 | `engagement-management/stage-gate-3-readiness.md` | `/gate 3` | prose |
| `09` | Retrospective; a library contribution **accepted by the library owner** | `09-Loop/retrospective.md` · `library-contribution.md` | `/harness-improver close` | prose + rows |

Any time: `/sketch` (before G1), `/mockup` (whenever you can name what the screen is for — logged in `05-Build/mockup-ledger.md`), `/dashboard`, `/render` (after G1), `/next`, `/chronicle`.

### Compressed engagements and simulations

If you have one day of discovery — a training simulation, a two-hour call, a compressed assessment — expect the following, and do not fight it:

- **The gates do not move.** G1 will read NOT READY, and that is the correct reading of one day's evidence. Do not answer the coach's questions from your own head to turn it green; that is the thing the gate exists to catch.
- **Use `/sketch` for alignment.** It is the artefact for "here is what we think we heard — is it right?", built from what you accepted, badged by evidence class, banner on. It is what you show at the end of day one.
- **Use `/next` to plan the second round.** It says who to talk to and why, with `means:` on every question, and `answer` writes down what you learn so it is not asked again.
- **Run agent commands from the main checkout.** Engagement folders are never committed, so an isolated worktree cannot see yours; the pre-flight will stop you before the agent fails.
- **Expect the coverage grid to be empty.** The dashboard leads with what is waiting, what is pending and the G1 checklist until you accept your first rows. That is early state, not a broken page.

## What it gives you

| | |
|---|---|
| **9 specialist agents** | discovery-analyst, ontology-engineer, solution-architect, engagement-manager, builder, evaluator, concept-mockup, chronicle, harness-improver |
| **18 slash commands** | the stage pipeline plus sketch, mockup, dashboard, render, the improvement loop — and `/commands`, which lists them all in stage order and says what to run next |
| **A house UI** | `hgs-app-ui` — the HGS app design system (navy chrome, Geist, tokens, page patterns) behind every concept mockup and every MVP surface |
| **9 practice skills** | observation protocol, requirements elicitation, allocation grid, ontology-first delivery, evidence handling, the four tests, the autonomy ladder, stage gates, ROI and readout |
| **50 templates** | every stage instrument, with machine-readable table anchors |
| **A published contract** | `03-Systems/ontology/` compiles to a governed assistant — see [`docs/contract.md`](docs/contract.md) |
| **A dashboard** | portfolio and per-engagement views, derived from `state.json` |

## The frameworks it implements

Straight from the runbook, not invented — the gates below come from the bootcamp instead, and [`docs/conformance.md`](docs/conformance.md) keeps the two apart:

- **The operating map** — nine elements, including *dead ends* and *failure modes*
- **The five roles** — sponsor, process owner, operator, **exception holder**, systems gatekeeper
- **The four tells** — repeated task, copy-paste between systems, tool switching, dead time
- **The allocation grid** — every step assigned to deterministic / model judgement / human gate / **leave alone**, with a written reason
- **Prioritisation on two axes** — value at stake and feasibility
- **The four tests** — right data, required steps, matches an expert, safe to act on
- **The autonomy ladder** — five rungs, each with an explicit exit criterion
- **The engagement ROI model** — nine inputs, four outputs

## Prerequisites

- **Node 24 or newer.** Everything under `packages/` runs TypeScript directly, with no build step — that is on by default from v24, and on v22 the documented commands fail with a syntax error that looks like a bug in the harness.
- [Claude Code](https://claude.com/claude-code) (`npm install -g @anthropic-ai/claude-code`)
- [`uv`](https://docs.astral.sh/uv/) — for `scripts/convert_to_md.py` (PDF, Word, PowerPoint, Excel)
- `git`

## Using it — step by step

If you read nothing else, read this. **You produce raw material and have conversations. The harness produces structure and tells you what is missing.**

### Step 0 — Get set up (once)

```powershell
git clone https://github.com/jpsusarreyHGS/fde-harness.git
cd fde-harness
.\setup.ps1
```

```bash
git clone https://github.com/jpsusarreyHGS/fde-harness.git
cd fde-harness
./setup.sh
```

The script checks your Node version, installs dependencies, and stops with an explanation if something is missing. It should finish with no manual steps. Then:

```bash
claude
```

Everything below happens inside Claude Code, in this directory.

### Want to try it before a real client?

```bash
node scripts/load-example.mjs northwind-insurance
```

Three example engagements live in [`examples/`](examples/) — the answers and
the raw evidence an FDE produces on a first visit, nothing pre-filled. One is
the happy path, one is a works-council site where the policy and the COO both
contradict what the shadowing found, one is deliberately messy. Work them
exactly as you would a client.

### Step 0.5 — You will usually arrive with a brief

Somebody sold this work before you landed. There is a scope, probably a promise, possibly a stated problem and a stale data dictionary. **That brief is a hypothesis, not a finding** — the practice's own rule is that customers describe solutions, not problems, and the request you were handed is a solution somebody already chose.

Two files, filled before the first client meeting rather than after:

- **`00-Setup/engagement-mandate.md`** — what was sold, to whom, what was promised, what is explicitly out, and what nobody discussed either way. This is the baseline every later scope decision is judged against. Today, if you skip it, that baseline is a sentence you typed from memory on day one.
- **`00-Setup/entry-hypotheses.md`** — the request verbatim, what you were given, and **three hypotheses with the evidence that would disprove each**. Written before you watch anything, and expected to be wrong. G1 asks whether each was supported or disproved, not whether you were right.

Commercial paper goes in `00-Setup/agreement/`, which sits outside the evidence classes on purpose — an SOW we wrote is not the client describing their own operations. Its README says what may be copied in; an executed contract stays with legal.

**The gap between what was sold and what discovery finds is the most valuable output of an assessment.** It is either a scope change or a better problem, and you cannot see it without writing both down.

### Step 1 — Create the engagement

```
/init-engagement
```

You will be asked twelve things in one go, each with a one-line explanation and an example: client name, slug, sponsor, one-line scope and where it came from, non-goals, target systems, ontology repo, target platform, data residency, and whether there is a works council or union.

**Say `TBD` when you do not know.** Do not guess a sponsor or a residency posture — one names who settles a dispute, the other decides whether you can legally start capturing. Every `TBD` becomes an open question with an owner and a note about what it blocks, so nothing quietly goes missing.

**Non-goals** trips people up: it means *what the client has explicitly said this engagement will not do* — replace a system, change a policy, touch a portal. Give at least one. If you genuinely have none, write `none stated — confirm with sponsor` and it becomes a question for the sponsor rather than a blank.

You get `engagements/<slug>/` with ten stage folders, 58 seeded instruments, a mirrored `deliverables/<slug>/`, and a `state.json` that honestly reports almost everything as empty. **That is correct.** An engagement that looks half-full on day one was seeded with fake numbers.

### Step 2 — Settle two things before you capture anything

Neither is optional, and the harness will stop you.

1. **Sign the evidence-handling terms** — `00-Setup/evidence-handling-terms.md`. Residency, retention, redaction, access, deletion, onward use. `discovery-analyst` hard-stops without them, because evidence captured under unresolved terms may have to be destroyed, and destroying discovery evidence means redoing discovery.
2. **Check the monitoring constraint.** Desktop task mining and session replay are employee monitoring. In works-council jurisdictions and unionised environments they need **consultation, not notice** — a process with a counterparty who can say no. Getting this wrong ends an engagement rather than delaying it.

### Where the engagement lives — and why an isolated worktree cannot see it

`engagements/<slug>/` is **client data, and it is never committed** — `.gitignore` excludes it on purpose, and this repository is public. The folder exists only in the checkout where you created it; back it up to the client's SharePoint, not to git.

That has one consequence worth knowing before you dispatch anything. Some host tools isolate a subagent in a fresh git worktree — a copy of the repo checked out from `origin/main`. That copy contains no engagements at all, so an agent started there fails with a confusing refusal three steps in. Every agent command now runs a pre-flight first and stops with a plain message if the engagement is not visible:

```bash
node scripts/preflight.mjs engagements/<slug>
```

If it fails: run agent commands from the main checkout, or turn off worktree isolation in your host tool. Do not work around it by committing the engagement.

### Step 3 — Go and watch. Come back with material.

This is the part only you can do, and the reason the rest exists: **eight hours beside the operator gets you the job.** Spend them watching, not typing.

Bring back whatever you actually produced — shift notes, a call transcript, an SOP, a system export, a photograph of a whiteboard — and drop each file into the folder that says what it is:

```
engagements/<slug>/02-Workflow/evidence/
├── observed/      you watched it happen        → primary evidence
├── system/        a log, export, record        → primary for volume and frequency
├── documented/    an SOP, policy, spec, deck   → aspirational until observed
└── stated/        an interview, call, meeting  → corroborating only
```

**The folder decides the class, never the content.** A confident-sounding transcript in `stated/` stays Stated evidence, and anything sourced only from it gets labelled `UNVERIFIED`. That discipline is the difference between a requirement that survives UAT and one that does not — so it is structural, not something you have to remember at the end of a long day.

Four questions, in order — the first yes wins. **Did you watch it happen** → `observed/`. **Did a machine produce it** → `system/`. **Is it a written rule or spec** → `documented/`. **Did someone tell you** → `stated/`. The two day-one mistakes: interview notes in `observed/` (you typed them, but they record what someone *said* — that is `stated/`), and leaving `stated/` empty because you were not sure what went there. There is a `README.md` inside `evidence/` with the same rule.

A file dropped outside a class folder is **reported, never guessed at**. And when a file's format or first lines disagree with its folder — a `.vtt` transcript in `observed/`, a `.csv` in `stated/`, a file called `policy` anywhere but `documented/` — `intake` prints a one-line warning saying what it looks like, where it belongs and what leaving it there costs. It never moves anything. The folder still decides; you decide the folder.

PDFs, Word, PowerPoint and Excel need converting first:

```bash
uv run --script --frozen scripts/convert_to_md.py "<path>" --out ./tmp_conversion.md
```

For a spreadsheet, `--formulas` extracts the cell logic (`=B2*C2`) instead of the computed numbers — that is how you reverse-engineer a client's model rather than read its output:

```bash
uv run --script --frozen scripts/convert_to_md.py "<path>.xlsx" --formulas --out ./tmp_formulas.md
```

Write the conversion into the engagement folder, read it, delete it. A stray conversion is an unredacted copy of client material sitting outside its intended store.

Audio and images need a transcript or a description written first — the harness has no transcription service and will say so rather than fail confusingly.

### Step 4 — Turn it into structure

```
/capture
```

The agent reads what is waiting and extracts into **every instrument the material supports** — not just the workflow registers. One interview typically names the sponsor, three of the five roles, four systems and a dozen client terms, and all of that lands:

| From the source | Lands in |
|---|---|
| A named person with a role | `01-Organisation/stakeholder-map.md` — the five roles, or the "other stakeholders" table |
| What the sponsor said success looks like, verbatim | `01-Organisation/sponsor-brief.md` |
| Actions, steps, exceptions, questions | `02-Workflow/` — observation log, operating map, exception register, requirements, open questions |
| A system, portal, mailbox or spreadsheet where work happens | `03-Systems/systems-inventory.md` |
| An access constraint, review timeline, missing API | `03-Systems/readiness-scorecard.md` |
| A client-specific term or code | `03-Systems/vocabulary-audit.md` |

It writes the result as **proposed rows — a file you review, then `accept`** (the harness calls that file a *proposal*; nothing in it is real until you accept it) — and prints a **coverage block** underneath, so you can see at a glance whether it got everything:

```
  stakeholder-map      4 rows proposed   (source named 4 people)
  systems-inventory    6 rows proposed   (source named 5 systems)
  sponsor-brief        0 fields          ← source contains a sponsor; nothing extracted. Check.
```

The right-hand column is a cheap, deterministic scan of the source — who it names, what systems, which figures. A `← Check.` line means the source plausibly supported that instrument and the agent proposed nothing for it: ask it why, or run the scan yourself and compare:

```bash
node packages/derive/src/cli.ts sweep engagements/<slug> <source-file>
```

**Nothing reaches a register until you accept it.** Fix a cell, delete a row that is wrong, then:

```bash
node packages/derive/src/cli.ts pending engagements/<slug>
```

```bash
node packages/derive/src/cli.ts accept engagements/<slug> <proposal.md>
```

Decided against it? `reject` it with a reason, so the queue stops showing work nobody will do.

**Ids are blank on purpose.** Code mints `EV-`, `EX-`, `REQ-` and `Q-` at accept time, so the sequence stays contiguous even if another session wrote in between — and you never type or sequence one. An accept that cites an id which does not exist is refused whole, because a partial accept leaves the register in a state nobody chose.

Two kinds of block appear in a proposal. Most **add rows** to a register. A few **fill cells** on rows that already exist — the five roles in the stakeholder map, the sponsor's seven questions — because those tables are fixed and only their answers change. A fill never adds a row and never overwrites something already written; if a name is wrong, change it in the file yourself.

### Step 5 — Ask what to ask

```
/next
```

This is the half that talks back. It reads the evidence chain and the open gate's criteria and gives you **the conversations to have tomorrow, grouped by who can answer them** — with names attached where the stakeholder map has them, what each question blocks, and where to write the answer down.

```
Ana Fuentes — Exception holder
  · EX-002: who actually decides this one? Not the team — the person you
    go to when it is not obvious.
      why:    blocks the #1 workflow (claims triage); exception without rule holder
      means:  The rule holder is the person the eval golden set is built from.
              A good answer is one name and the rule in their own words —
              "the team" means nobody.
      goes:   02-Workflow/exception-register.md — Rule holder (role) column
```

Every question comes with the same four lines. **why** is the ranking. **means** is what a good answer looks like and why you should care — read it before you decide a question is noise; the sharpest ones often look like pedantry without it. **goes** is the file and column the answer lands in. Questions that came from a `TBD` at `/init-engagement` say so, and their fix is the setup file, not a client conversation.

It is ranked by **what each question blocks** — joined to your prioritisation table — and by **how fast the answer perishes**. An operator's undocumented rule is elicitable while you are sitting beside them and effectively gone three weeks later; a broken citation costs minutes at a desk in November. Every line says why it ranks where it does. If the reason looks wrong, fix the prioritisation table rather than the order.

Two other sections may appear. **"Verify first"** lists gate criteria whose answer is already in your files — the sponsor's sentence, the named roles, the systems — quoted back so you can check you could say it out loud; it will not ask the client for something you already captured. **"Yours to fix"** is the things nobody at the client can answer.

### Step 6 — Go back and ask. Write the answer down as you get it.

Answers go **into the instrument, not into chat**. A question answered in conversation and not written down is a question you will ask twice — and `/next` will ask it for you, tomorrow. So when someone gives you an answer, record it on the spot:

```bash
node packages/derive/src/cli.ts answer engagements/<slug> "Q-004" "It waits. Nobody else has the authority." --from "Priya Shah, deductions manager"
```

The first argument is a `Q-` id or the question in words; the second is what they said, verbatim; `--from` is who said it. It lands in `02-Workflow/evidence/stated/<date>-answers.md` — *stated*, because something a person told you is corroborating evidence until you have watched it. The next `/capture` turns it into proposed rows, you accept, and the question stops coming back. If you are answering it in chat with Claude, it will offer this command pre-filled; say yes.

For everything else, the loop you already know: bring back the notes, drop them in `evidence/`, and run `/capture` again.

```
watch → drop in evidence/<class>/ → /capture → accept → /next → ask → answer → repeat
```

### Step 6½ — Need something to show the client before the gate? `/sketch`

```
/sketch
```

With one day of discovery, G1 will be NOT READY — correctly. But you may still need a page to put in front of the sponsor to check you heard right. `/sketch` renders one: `deliverables/<slug>/sketch/<date>.html`, self-contained and branded, built **only from rows you have accepted**. Five sections — what we heard (the sponsor's sentence and the steps, each badged *observed* / *stated* / *unverified*), where the work is lost, what we do not yet know (grouped by who can answer), constraints already found, and what this is not.

Three things to know:

- **It never invents.** A step you have not accepted is not on it. If the page is sparse, accept more rows; do not edit the HTML.
- **It is the only thing allowed in `deliverables/` before G1**, and it says so — `PROVISIONAL — pre-G1 alignment sketch` in the header and footer. That banner does not come off; the route past it is `/gate 1` and then `/render`.
- **It shows what you heard, not what you will build.** Solution wireframes are your work after `/allocate`. The badges are the point: a page of *stated* lines is a request to go and watch.

### Step 6⅞ — Show them what it could look like, before anyone builds it: `/mockup`

```
/mockup the exceptions queue the coordinator works from
```

Any time you can name what a screen is for — a workflow, a use case, a pain point — you can put a picture of it in front of the people who hold the answers. `/mockup` renders **one self-contained HTML page** in the HGS app house style (navy chrome, Geist, the same tokens the MVP will use), with **synthetic data shaped to what discovery found** and, beside it, a panel headed *We assumed — correct us*: every gap in discovery, numbered, each pointing at a callout on the page and naming who can correct it. It opens anywhere, including a conference room with no network.

Three things make it safe to do this cheaply:

- **The watermark.** *Concept visualization — not a build commitment or spec*, in the header and the footer. Stakeholders screenshot these and forward them; the label travels with it. Code refuses to log a page without it.
- **The ledger.** `05-Build/mockup-ledger.md` records, for every version, what existed when it was built, what was assumed, who saw it and what they said — so "why does the MVP differ from the mockup?" has a written answer. Code mints the version; you never type one.
- **Reactions are evidence.** What the stakeholder says goes in through `answer` and `/capture`, like an interview. *"Saw v2, confirmed direction, 22 Sep"* is the single most valuable line in the discovery record — it is the decision everything downstream builds on. Corrections make v3.

It is not the sketch (what we *heard*, evidence-badged) and not the MVP (what it *does*, on real data). If you cannot name what the screen is for, the agent will say so and point you at `/next` instead — that is a judgment, not a gate, and you can overrule it.

### Step 6¾ — Rendering anything for the client: the client-safe pass

Whatever you render — the sketch now, the operating map and the readout later — goes through a **client-safe pass** before it becomes HTML, and prints a **redaction report** you can read in thirty seconds:

```
6 item(s) removed — 3 names · 1 citation · 1 source line · 1 source column.
| Line | Removed                          | Why                                   |
| 3    | Priya Shah → the process owner   | a named individual; roles are client-safe … |
| 9    | EV-001, EX-002, REQ-003          | harness ids mean nothing to a client …|
```

Names become roles unless you have approved them in `00-Setup/client-safe-names.md` (with who approved and when — the sponsor is not on it by default). Harness ids and `Source` lines and columns go. Anything quoted verbatim from `evidence/observed/` is withheld until you confirm, because shadowing consent may not cover publication. When the pass removes nothing, the report says so. `--internal` skips it for a page that is for us; do not send one of those on.

```bash
node scripts/render-deliverable.mjs <slug> 02-Workflow/operating-map.md
```

### Step 7 — See where you stand

```
/dashboard
```

Rebuilds `state.json` from what is actually on disk, then renders self-contained HTML — `dashboard.html` at the root for every engagement, `engagements/<slug>/dashboard.html` for one. Opens by double-click; no server, no build step. Outside Claude Code the same thing is:

```bash
node scripts/render-dashboard.mjs
```

**On day one it will not be a grid of numbers, and that is deliberate.** Until you have accepted your first rows into a discovery instrument, the engagement card leads with what to do next: material waiting in `evidence/` (with the `/capture` command), proposed rows awaiting accept, anything dropped outside a class folder, the G1 bar as a checklist with the one line that closes each item, and the next three conversations from `/next`. The full coverage grid and evidence chain appear once rows exist — and the waiting/pending strip stays at the top from then on, because a file dropped this morning is invisible to every register count.

**A red gate or an empty instrument is the harness working.** Never hand-edit `state.json` to make it look better — it is derived, and if it disagrees with the files, the files are right.

### Step 8 — The gate, when discovery feels done

```
/gate 1
```

A gate is a **stop, not a status update**. The memo recommends READY / READY WITH CAVEATS / NOT READY, and **a person decides** — code never sets `passed`, and a state file claiming otherwise is refused as tampered. An all-green memo on first pass usually means it was written from intent rather than evidence.

Past G1, the pipeline continues: `/allocate` (place the intelligence), `/architect` and `/build`, `/evaluate`, `/gate 2`, `/roi`, `/gate 3` — and the contract layer goes to the compiler, below.

### Step 9 — Hand discovery to the build

Past G1, the contract layer is what the build is made from. Check it will be accepted before you hand it over:

```bash
node packages/derive/src/cli.ts contract-check engagements/<slug>
```

Four things stop a build downstream, and all four are questions for a person rather than defects in your typing: a glossary term nobody owns, a competency question nobody was observed asking, a write with no approver, an entity with no system that mints it. They appear in `/next` with a name attached, ranked above everything else — a refusal is not advice, it is a build that will not happen.

Everything merely thin is a warning and does not block. A question with no template yet is progress you can see.

When it passes, [`ontology-compiler`](https://github.com/jpsusarreyHGS/ontology-compiler) reads the folder directly:

```bash
python -m core.importer engagements/<slug>/03-Systems/ontology --instance <slug> --target databricks
```

See [`docs/contract.md`](docs/contract.md) for what that folder has promised, and read it before you change anything in it — a template edit there is an API change in another repository.

### Bringing an old engagement forward

Templates change. To backfill an existing engagement onto the current set without touching anything you have written:

```bash
node packages/derive/src/cli.ts scaffold engagements/<slug> --json vars.json --dry-run
```

Read what it would create, then drop the flag. Existing files are never overwritten.

### If you get stuck

| Symptom | What it means |
|---|---|
| A command fails with a TypeScript syntax error | You are on Node 22. This needs 24 — check with `node -v` |
| I don't know which command to run next, and `/help` shows Claude Code's own help | `/commands` — the harness's own list, in stage order, plus where your engagement is and what to run next. Outside Claude Code: `node packages/derive/src/cli.ts commands engagements/<slug>` |
| `/capture` says nothing is waiting | Your files are outside a class folder. Run `node packages/derive/src/cli.ts intake engagements/<slug>` and it will name them |
| `intake` says my notes "look like an interview" | They are in `observed/` and read as something someone told you. If a person told you, move the file to `stated/`. If you genuinely watched it, leave it — the warning never moves anything, and the folder decides |
| The dashboard shows an instrument as empty that you filled | It has no table anchor, or you wrote outside the anchored table. Report it — that is a defect, not your mistake |
| I want to ask "what should I do next?" without interrupting a running `/capture` | Type `/btw <your question>` in Claude Code. It answers on the side and the running command continues; nothing in the harness changes |
| The dashboard is "empty" on a new engagement | It is not — it is in early state. Look at the strip at the top: material waiting, rows pending, the G1 checklist. The coverage grid appears after your first accept. If the page is genuinely blank, open the browser console and report the error |
| An accept is refused | It cites an id that does not exist. The message names it |
| `/capture` filled the observation log but the stakeholder map is still empty | Look at the coverage block under the proposal. A `← Check.` line names the instrument the source supported and the agent skipped — ask it to re-read for that, or run `cli.ts sweep` to see what the source names |
| An accept says a cell "already holds" a value | A fill never overwrites. Someone already wrote that name or answer; edit the file deliberately if it is wrong |
| `/next` has nothing to say | Either nothing is genuinely blocked, or the gate memo has not been started |
| I need something to show the client and G1 is NOT READY | `/sketch` for what you heard, `/mockup` for what it could look like. Both are pages to be corrected, not designs — the sketch is evidence-badged, the mockup is synthetic with its assumptions listed |
| `mockup log` refused my file | Either the watermark is missing from the header or footer (it must appear twice, verbatim), or the page names a real person from the stakeholder map. A mockup is synthetic — use the role, or approve the name in `00-Setup/client-safe-names.md` |
| The MVP does not look like the mockup the sponsor approved | `05-Build/mockup-ledger.md` says which version they confirmed; `builder` must write the difference down in its build report and in `decisions.md` before building. If it did not, that is the finding |
| The sketch is missing a step I captured | It is in a proposal you have not accepted. `cli.ts pending`, then `accept` — the sketch reads registers only, never proposals |
| A rendered page says "the process owner" where I wrote a name | The client-safe pass replaced it. To show the name, add it to `00-Setup/client-safe-names.md` with who approved it, and re-render. The `.redactions.md` beside the page lists every replacement |
| `/allocate` (or any agent command) stops with "`engagements/<slug>` is not visible from this session" | The session is in an isolated git worktree, which holds no engagement folders because they are never committed — or the engagement was created in a different checkout. Run from the main checkout or turn off worktree isolation; `git worktree list` shows which you are in |
| `/next` keeps asking something I already answered | Answers given in chat are not evidence until written down. Run `cli.ts answer …` with the answer and who said it, then `/capture` and accept. If the answer is already in an instrument — the sponsor brief, the stakeholder map — it should appear under "Verify first", not as a question; if it does not, report it |

Anything the harness gets wrong is worth logging: `/harness-improver`. **Nothing enters the shared library without a named engagement that needed it.**

## Two ideas worth understanding first

**The judgment chain.** Every artefact traces to evidence:

```
map → grid → spec → build → eval → claim
```

Enforced at write time, not review time. A requirement with no source is not a requirement; an allocation with no written reason is not an allocation; a claim with no eval behind it is a hope. **Any broken link is a named defect.**

**The boundary rule.** `.claude/skills/skills-practice/` and `.claude/templates/` hold **assets**, reusable across every client. `engagements/<slug>/` holds **instances**, true for exactly one client. Every instance is seeded by an asset, and **every engagement returns something to the library at close** — the bootcamp makes that a certification requirement. An engagement that compounds nothing is staffing, not a practice.

## Folders

| | |
|---|---|
| `engagements/` | Working files per engagement, in ten stage folders |
| `deliverables/` | Client-facing outputs, mirrored per stage |
| `datasources/` | Client input files. **Read-only to the harness** |
| `.claude/skills/skills-practice/` | The practice method — reusable |
| `.claude/templates/` | Instrument templates. Every engagement artefact is seeded from here |

Client-calibrated skills live at `engagements/<slug>/skills-engagement/` and **supersede** practice skills for that engagement.

## The dashboard

```
/dashboard
```

Two phases: **derive** `state.json` by counting what exists on disk, then **render** self-contained HTML. Opens by double-click — no server, no build step.

`state.json` is derived, never authoritative. If it disagrees with the files, the files are right. **Never hand-edit it to make the dashboard look better** — a red gate is the harness working. Gates derive only as far as `ready`; **only a person sets `passed`**, with their name.

Derivation is driven by table anchors (`<!-- table:<instrument>.<table> role=register id=Id -->`), so headings can be reworded without breaking the parse. Schema: `.claude/skills/skills-function/render-dashboard/state-schema.md`.

## Ontology pipeline

`03-Systems/ontology/` is not a working folder. **It is a published interface**, read by [`jpsusarreyHGS/ontology-compiler`](https://github.com/jpsusarreyHGS/ontology-compiler) — which states the ownership plainly: *"The harness is the authority for this format; if the two ever diverge, the harness wins."* So a template edit here is an API change there.

**[`docs/contract.md`](docs/contract.md) is what we have promised** — the anchor names, the filenames, the id rules, the parser semantics, and the four preconditions the compiler refuses to build past. Read it before changing anything in that folder.

Check before you hand over:

```bash
node packages/derive/src/cli.ts contract-check engagements/<slug>
```

It runs the compiler's own four refusals locally, so a gap is found on the day it was created rather than in a Python traceback weeks later. **Thinness is a warning; a missing owner is a refusal** — a question with no template yet is visible progress, a glossary term nobody owns is an unanswered question about who decides. Every refusal a person can answer carries a role, and `/next` ranks it above ordinary findings.

Then:

```bash
python -m core.importer engagements/<slug>/03-Systems/ontology --instance <slug> --target databricks
```

The target comes from `00-Setup/stack-decision.md`. **Choose it from the competency questions, not from precedent** — a triple store earns its place where relationship traversal and per-fact provenance are the point; where the questions are aggregations over known joins, a warehouse with a semantic model on top is less machinery for the same answer.

`ontology-engineer` is the only agent that writes to an ontology repo, and every write is logged in `03-Systems/ontology/promotion-log.md` against the requirement that justified it. The credit-union reference implementation now lives inside the compiler as `examples/srcu/`.

## Extending it

`CLAUDE.md` is the constitution — read it before changing anything structural. `harness-improver` may edit skills, templates and `CLAUDE.md`, but **never agent prompts**: those are the harness's contract, and changing one is a deliberate human action.

Nothing enters the library without a named engagement that needed it.
