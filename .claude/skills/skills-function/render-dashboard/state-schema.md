# `state.json` schema

**Version 2.** The contract between the engagement files and everything that reads them — the dashboard today, the web app's ingest endpoint next.

`state.json` is **derived, never authoritative.** Every value counts things that exist as files. If this and the engagement files disagree, **the files are right — regenerate.**

## Table anchors — how derivation is made reliable

Every table in every instrument carries an HTML-comment anchor immediately above it:

```
<!-- table:<instrument>.<table> role=register id=<column> -->
<!-- table:<instrument>.<table> role=kv -->
<!-- table:<instrument>.<table> role=labels key=<column> -->
```

| `role` | Meaning | Counted? |
|---|---|---|
| `register` | One row per object. The `id` attribute names the key column | **Yes** |
| `kv` | Two-column key/value block. Some have no header row | No |
| `labels` | Fixed dimension rows shipped by the template (the five roles, the five rungs, the four tests) | No — the rows are the schema, not data |

**Anchors, not headings, identify tables.** A heading can be reworded without breaking the parser; an anchor cannot be reworded by accident. Renaming an anchor is a deliberate schema change.

**A derived aggregate is never stored in markdown.** Tell counts, the chain audit, competency coverage and gate coverage are all computed at derive time. Storing them would violate the same "derived, never authoritative" rule this file rests on, and they drift immediately.

## Four contract rules, learned the hard way

1. **Only `role=register` tables contribute counts.** Counting every table in a file inflates every number, because each instrument holds three to twelve tables.
2. **Templates ship zero data rows.** A freshly initialised engagement derives all-zero counts and every instrument `empty`. Anything else means fake seed data.
3. **The `Source` column, not a `Source:` prose line**, carries requirement provenance. It holds one or more comma-separated `EV-` / `EX-` ids.
4. **`ageDays` is never stored.** Compute it from `raised` at read time, or it is wrong the day after derivation.

## Top level

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | `2` |
| `generatedAt` | ISO 8601 | Clock at derive time |
| `engagement` | object | Identity and posture. **Authored, not derived** |
| `stages` | array | Ten stage objects, `00`–`09`, in order |
| `gates` | array | G1, G2, G3 |
| `instruments` | array | Per-instrument row counts |
| `chain` | object | Judgment-chain health |
| `openQuestions` | array | Unanswered only |
| `raid` | array | Risks, assumptions, issues, dependencies |
| `allocations` | object | Allocation-grid counts by category |
| `prioritisation` | array | Ranked workflows with both axes |
| `autonomy` | array | Measured rungs per workflow |
| `evals` | object | The four tests plus the regression gate |
| `roi` | object | Inputs labelled by provenance, and outputs |
| `deliverables` | array | Rendered client-facing artefacts |
| `datasources` | array | Input files and classification |
| `skills` | object | Counts and detected supersedes |
| `harnessImprover` | object | Loop health |
| `sessions` | object | Count, latest id, latest summary |
| `runEvents` | object | Machine-readable agent-run summary |
| `friction` | array | Harness friction from the last three logs |

## `engagement`

```
{ "slug", "client", "sponsor", "scope", "nonGoals", "stage",
  "startedAt", "ontologyRepo", "residency", "labour" }
```

`residency`: `client-tenant` | `hgs-tenant` | `tbd`.
`labour`: `works-council` | `union` | `none` | `unknown`. **Anything but `none` means the monitoring constraint applies**, and the dashboard raises a banner.

## `stages[]`

```
{ "id": "02", "slug": "02-Workflow", "label": "Gather the real workflow",
  "status": "not-started|active|complete|blocked", "pct": 0-100 }
```

Ten entries. `pct` is a computed ratio, **never a subjective estimate**:

| Stage | `pct` is |
|---|---|
| `00`–`03` | Populated `role=register` tables over total, across that stage's instruments |
| `04` | Allocated operating-map steps over total steps |
| `05` | Requirements marked implemented over in-scope requirements |
| `06` | Eval cases passing over total |
| `07` | Highest rung with a measurement, over 5 |
| `08` | ROI inputs populated over 9 |
| `09` | Library contributions accepted over 1 (binary) |

## `gates[]`

```
{ "id": "G1", "label": "Discovery", "between": "03→04",
  "status": "not-run|ready|caveats|not-ready|passed",
  "date": null, "decidedBy": null,
  "criteria": [ { "name", "status": "met|partial|unmet", "evidence", "toClose", "owner" } ],
  "behaviours": [ { "name", "observed": bool, "where" } ] }
```

**`ready` is machine-derivable. `passed` is not.** Code may compute up to `ready`; only a person sets `passed`, and `decidedBy` must be non-null when they do. A derive pass that finds `passed` with a null `decidedBy` must reject the file as tampered.

`behaviours` matters as much as `criteria` — G1's sharpest test is whether the team can state the sponsor's real problem in one sentence that is not what they asked for.

## `instruments[]`

```
{ "id", "label", "path", "stage", "rows", "tables": [{name, role, rows}],
  "status": "empty|thin|populated", "updated": "YYYY-MM-DD" }
```

`rows` sums **`role=register` tables only**. Thresholds: `empty` = 0, `thin` = 1–4, `populated` = 5+.

## `chain`

```
{ "evidence":     { "total", "observed", "system", "documented", "stated" },
  "exceptions":   { "total", "withRuleHolder", "quantified" },
  "requirements": { "total", "sourced", "verified", "unverified", "assumption", "withAC" },
  "allocations":  { "total", "withReason" },
  "ontologyObjects": { "promoted", "backlog" },
  "competencyQuestions": { "total", "answerable", "needsData", "notModelled" },
  "evalCases":    { "total", "passing", "failing", "p0" },
  "audit":        { "unsourcedRequirements", "orphanEvidence", "danglingCitations",
                    "staleUnverified", "unownedAssumptions" } }
```

**Enum values match the template cells exactly**, hyphenated and lower-case: `needs-data`, `not-modelled`, `model-judgement`, `human-gate`, `leave-alone`. The schema keys are camelCase; the *values* are not. `UNVERIFIED` keeps its upper case — that is load-bearing.

The four headline ratios the dashboard leads with:

- `requirements.sourced / total` — sourcing discipline
- `exceptions.withRuleHolder / total` — **the ceiling on eval quality**
- `allocations.withReason / total` — whether the grid will survive challenge at G2
- `competencyQuestions.answerable / total` — real coverage, countable because questions map 1:1 to templates

`audit` is the chain audit run as **real validation**, not a hand-maintained table. A non-zero `danglingCitations` is a defect with a location.

## `allocations`

```
{ "deterministic", "modelJudgement", "humanGate", "leaveAlone",
  "unallocatedSteps", "declinesArgued" }
```

`leaveAlone` at zero on a real engagement is a signal, not an achievement — the bootcamp certifies "correctly identified at least one thing that should not be built."

## `prioritisation[]`

```
{ "rank", "workflow", "valueAtStake", "feasibility", "quadrant",
  "weakestFactor", "blocker", "blockerOwner", "costPerTxn",
  "manualCostPerTxn", "recommendation": "build|decline|defer" }
```

`feasibility` is the **lowest** of the five factors, not the average.

## `autonomy[]`

```
{ "workflow", "rung": 1-5, "rungLabel", "exitCriterion",
  "agreement": 0.0-1.0|null, "sample": int|null, "window",
  "disagreementPattern": "clustered|scattered|null", "disagreementDetail",
  "understood": bool, "p0", "measuredAt", "decidedBy" }
```

**`agreement: null` renders as "asserted, not measured", in red.** That is the point of the field. Rung 2's exit criterion has two halves — agreement *and* disagreements understood — so `understood: false` blocks progression regardless of the rate.

## `evals`

```
{ "suite", "runDate", "heldOutSlice": bool,
  "tests": { "01": {passed, failed}, "02": {...}, "03": {...}, "04": {...} },
  "failureClasses": [ { "class", "count", "addressable": bool } ],
  "regressionGate": { "brokenChangeTested": bool, "blocked": bool, "testedAt" },
  "auditTrail": { "anyRunReproducible": bool } }
```

Failures are grouped **by class**, because a class is fixable and a scattered percentage is not.

## `roi`

```
{ "inputs": [ { "n": 1-9, "name", "baseline", "actual",
                "provenance": "measured|modelled|assumed", "source" } ],
  "outputs": { "hoursRecoveredPerMonth", "netBenefitPerMonth",
               "paybackPeriod", "yearOneNet" },
  "counterMetrics": [ { "name", "baseline", "floor", "actual", "owner" } ],
  "attribution": { "basis", "agreedWithSponsor": bool } }
```

**Every input carries `provenance`.** An unlabelled figure gets read as measured, and a G3 criterion is a *measured* outcome. `provenance: "assumed"` on a headline input is a finding the dashboard should surface.

## `openQuestions[]`

```
{ "id", "question", "why", "owner", "blocks", "raised" }
```

No `ageDays`. Compute from `raised`. Sort by age descending; an aged question blocking a top-ranked workflow is the most actionable thing on the dashboard.

## `raid[]`

```
{ "type": "risk|assumption|issue|dependency", "item", "owner",
  "impact": "high|medium|low", "review", "status" }
```

Missing `owner` or `review` renders as a **defect**, not a row — per `engagement-manager`, it is not actually tracked.

## `deliverables[]` · `datasources[]` · `skills` · `harnessImprover` · `sessions`

```
deliverables: { "name", "stage", "rendered", "path", "renderedAt" }
datasources:  { "name", "sizeBytes", "classification": "raw|converted|redacted",
                "source", "receivedAt" }
skills:       { "practice", "engagement", "function",
                "supersedes": [ { "engagementSkill", "practiceSkill" } ] }
harnessImprover: { "lastRun", "openProposals", "feedbackFilesWithEntries",
                   "pendingPromptEdits" }
sessions:     { "count", "latest", "latestSummary", "latestDate" }
```

`skills.engagement` counts `engagements/<slug>/skills-engagement/`, **not** anything under `.claude/` — client-calibrated skills are an instance.

`pendingPromptEdits` counts proposed agent-prompt changes awaiting deliberate human promotion. It should be visible, and non-zero sometimes; a permanently-zero value means either nothing is being learned or the loop is not running.

## `runEvents`

New in v2, and the reason state derivation no longer needs an interactive session.

```
{ "count", "latest", "byAgent": { "<agent>": count },
  "lastRun": { "agent", "stage", "sessionId", "idsWritten": [],
               "decisionsSurfaced": [], "costUsd", "at" } }
```

Each agent invocation appends one JSON event to `chronicle/run-events/`. Together with the register parse, this replaces the session narrative that previously lived only in a human's terminal — which is what made `chronicle` unautomatable.

## `friction[]`

```
{ "session", "note" }
```

From the Harness friction section of the last three session logs. Empty is legitimate; fabricated is not.

## Migration from v1

| v1 | v2 |
|---|---|
| `phases[]`, 6 entries | `stages[]`, 10 entries `00`–`09` |
| `useCases[]` with 7 scores | `prioritisation[]` with 2 axes, plus `allocations` |
| `chain.evalCases` only | `evals` with the four tests and the regression gate |
| `autonomy[].rung` string | `rung` 1–5 integer plus `exitCriterion` and `understood` |
| — | `roi`, `runEvents`, `chain.audit`, `instruments[].tables` |
| `openQuestions[].ageDays` stored | Removed; computed at read time |

A v1 file should be regenerated, not migrated. It is derived — there is nothing in it worth preserving.
