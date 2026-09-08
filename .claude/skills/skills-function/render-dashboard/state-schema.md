# `state.json` schema

Version 1. The contract between the harness and the dashboard.

**`chronicle` is the canonical writer** (at session end); `/dashboard` regenerates it on demand. Every value is derived by counting files — nothing in here is authoritative on its own. If this file and the engagement files disagree, the files are right.

## Top level

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | int | `1` |
| `generatedAt` | ISO 8601 | When derived |
| `engagement` | object | Identity and posture |
| `phases` | array | Six phase objects, in order |
| `gates` | array | G1, G2, G3 |
| `instruments` | array | Discovery instruments with row counts |
| `chain` | object | Evidence-chain health |
| `openQuestions` | array | Unanswered only |
| `raid` | array | Risks, assumptions, issues, dependencies |
| `autonomy` | array | Measured rungs per workflow |
| `useCases` | array | Ranked, with scores |
| `deliverables` | array | Rendered client-facing artefacts |
| `datasources` | array | Input files and their classification |
| `skills` | object | Counts and detected supersedes |
| `harnessImprover` | object | Loop health |
| `sessions` | object | Count, latest id, latest summary |
| `friction` | array | Harness friction from the last three logs |

## `engagement`

```
{ "slug", "client", "sponsor", "scope", "nonGoals", "phase",
  "startedAt", "ontologyRepo", "residency", "labour" }
```

`residency`: `client-tenant` / `hgs-tenant` / `tbd`.
`labour`: `works-council` / `union` / `none` / `unknown`. **Anything but `none` means the monitoring constraint applies** and the dashboard surfaces it as a banner.

## `phases[]`

```
{ "id": "01-Discovery", "label": "Discovery",
  "status": "not-started|active|complete|blocked", "pct": 0-100 }
```

`pct` for Discovery is instrument coverage — populated instruments over total. For later phases it is closed requirements over in-scope requirements. **Never a subjective estimate.**

## `gates[]`

```
{ "id": "G1", "label": "Discovery readiness",
  "status": "not-run|ready|caveats|not-ready|passed",
  "date": null, "decidedBy": null,
  "criteria": [ { "name", "status": "met|partial|unmet", "evidence", "toClose", "owner" } ] }
```

## `instruments[]`

```
{ "id", "label", "path", "rows": 0,
  "status": "empty|thin|populated", "updated": "YYYY-MM-DD" }
```

Thresholds: `empty` = 0; `thin` = 1-4; `populated` = 5+.

## `chain`

```
{ "evidence":    { "total", "observed", "system", "documented", "stated" },
  "exceptions":  { "total", "withRuleHolder", "quantified" },
  "requirements":{ "total", "sourced", "verified", "unverified", "assumption", "withAC" },
  "competencyQuestions": { "total", "answerable", "needsData", "notModelled" },
  "ontologyObjects": { "promoted", "backlog" },
  "evalCases":   { "total", "passing", "failing", "p0" } }
```

This object is the dashboard's most important panel. Three ratios are the health signals an FDE should see first:

- **`requirements.sourced / requirements.total`** — sourcing discipline. Below 1.0 means unsourced rows are sitting in the register looking sourced.
- **`exceptions.withRuleHolder / exceptions.total`** — how much of the undocumented knowledge has an owner. This is the ceiling on eval quality.
- **`competencyQuestions.answerable / total`** — real ontology coverage, and only countable because questions map 1:1 to templates.

## `openQuestions[]`

```
{ "id", "question", "why", "owner", "blocks", "raised", "ageDays" }
```

Sort by `ageDays` descending. An aged open question that blocks a top-ranked use case is the single most actionable thing on the dashboard.

## `raid[]`

```
{ "type": "risk|assumption|issue|dependency", "item", "owner",
  "impact": "high|medium|low", "review", "status" }
```

An entry with no `owner` or no `review` date renders as a defect, not a row — per `engagement-manager`, it is not actually tracked.

## `autonomy[]`

```
{ "workflow", "rung": "shadow|suggest|approval|audit",
  "agreement": 0.0-1.0, "sample", "window",
  "divergence": "clustered|scattered|n/a", "divergenceDetail",
  "p0": 0, "measuredAt", "decidedBy" }
```

**A row with `agreement: null` renders as "asserted, not measured" in Red.** That is the point of the field.

## `useCases[]`

```
{ "rank", "name",
  "scores": { "value","feasibility","data","aiSuitability","risk","timeToValue","reusability" },
  "total", "blocker", "blockerOwner", "unitCost", "volumeAssumed", "status" }
```

## `deliverables[]`

```
{ "name", "phase", "rendered": true, "path", "renderedAt" }
```

## `datasources[]`

```
{ "name", "sizeBytes", "classification": "raw|converted|redacted",
  "source", "receivedAt" }
```

## `skills`

```
{ "practice": 0, "engagement": 0, "function": 0,
  "supersedes": [ { "engagementSkill", "practiceSkill" } ] }
```

Surfacing supersedes matters: an FDE reading a practice skill needs to know an engagement skill overrides it.

## `harnessImprover`

```
{ "lastRun", "openProposals": 0, "feedbackFilesWithEntries": 0,
  "pendingPromptEdits": 0 }
```

`pendingPromptEdits` counts proposed agent-prompt changes sitting in feedback files awaiting deliberate human promotion. **It should be visible and it should be non-zero sometimes** — a permanently-zero value means either nothing is being learned or the loop is not running.

## `sessions`

```
{ "count", "latest", "latestSummary", "latestDate" }
```

## `friction[]`

```
{ "session", "note" }
```

From the Harness friction section of the last three logs. Empty is legitimate; fabricated is not.
