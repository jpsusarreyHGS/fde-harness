# The contract layer

**`engagements/<slug>/03-Systems/ontology/` is a published interface.** It is read by [`jpsusarreyHGS/ontology-compiler`](https://github.com/jpsusarreyHGS/ontology-compiler), which compiles it into a governed assistant on Jena or Databricks.

That repo states the ownership plainly, in `core/contract/anchors.py`:

> A faithful port of the harness's `packages/derive/src/anchors.ts`. **The harness is the authority for this format; if the two ever diverge, the harness wins** and this module is the thing that changes.

And in its `CLAUDE.md`:

> The contract schema and this repo disagree → **stop and report.** The schema is the harness's; it changes there first.

So a template edit here is an API change there. This file says what we have promised, so that breaking it is a decision somebody makes rather than a Tuesday afternoon.

**`harness-improver` must read this before touching anything under `03-Systems/ontology/` or `05-Build/spec.md`.**

---

## Version

```
fde-harness/03-Systems-ontology@2026-09
```

Declared in `packages/derive/src/instruments.ts` as `CONTRACT_SCHEMA`, carried in every `state.json`, and stamped by the compiler into every artefact it emits.

**Bump it when a column is renamed or removed. Never when one is reworded.** Headers are matched on a normalised form — `**Grain — one row is one what?**` and `Grain` are the same column downstream — so a version that moves on cosmetics is a version people learn to ignore.

## The six commitments

### 1. Anchor names

Anchors are the schema. A heading can be reworded freely; **a renamed anchor is a deliberate schema change** and produces a hard parse failure downstream, by design.

Six are required. Their absence aborts the parse before any refusal is even evaluated:

```
glossary.terms
personas.permissions
personas.write-allow-list
competency-questions.rows
source-systems.identity-rules
source-systems.field-mappings
```

The rest are read when present: `glossary.{grain-splits,canonical,not-yet-defined}`, `personas.{rows,impersonation}`, `competency-questions.cut`, `entities.{rows,properties,relationships,events,shapes}`, `source-systems.{sources,identifier-convention,provenance,validation}`, `ontology-backlog.{rows,parked}`, `promotion-log.{rows,reversals,version-changes}`, `spec.{header,steps,write-backs,scope-boundary}`.

### 2. Filenames

| File | Required |
|---|---|
| `03-Systems/ontology/glossary.md` | **yes** |
| `03-Systems/ontology/personas.md` | **yes** |
| `03-Systems/ontology/competency-questions.md` | **yes** |
| `03-Systems/ontology/source-systems.md` | **yes** |
| `03-Systems/ontology/entities.md` | no — but the shapes live here, so without it there is no constraint coverage |
| `03-Systems/ontology/backlog.md` | no |
| `03-Systems/ontology/promotion-log.md` | no |
| `05-Build/spec.md` | no |

**`spec.md` is the one cross-stage dependency.** The compiler resolves `../../05-Build/spec.md` relative to the contract directory, which lands exactly on the harness's own path. Moving either directory breaks that arithmetic silently.

### 3. Column headers

Matched on a normalised form: markdown emphasis stripped, lowercased, punctuation collapsed. **Reword presentation freely. Renaming the concept is a breaking change.**

### 4. Id minting

`CQ-NN` and `WR-NN` are the join key across the whole downstream system — read templates are named `cq-NN-<slug>`, writes `wr-NN-<slug>`, in filenames, registry ids and emitted artefacts, in every target. On Databricks the SQL object is the underscored form, because a SQL identifier cannot contain a hyphen.

- `CQ-` must match `^CQ-\d{2,}$`, be unique, and be append-only.
- `WR-` is minted here now. Before that the compiler minted its own by row position, stable only while rows were strictly appended.

Both are width 2, minted by `packages/derive/src/ids.ts`. **An id that changes changes a filename in another repository.**

`EX-` is the one to watch. It reaches generated dbt test filenames and an `exception_id` column verbatim, and the compiler has no exception register to check it against — so `EX-001..EX-010` becomes `ex_001_ex_010` and nobody notices. `contract-check` is the last place that can be caught.

### 5. Parser semantics

From `packages/derive/src/anchors.ts`, ported downstream:

- A struck-through id cell (`~~EV-014~~`) marks the row **retired** — findable for citations, excluded from data.
- Blank sentinels: `""`, `-`, `—`, `n/a` are absent. The compiler also counts `tbd`, `tbc` and `?`; `contract-check` matches that wider set.
- `\|` is literal content, not a delimiter.
- **Unanchored tables are ignored.** A table with no anchor above it does not exist to either repo.

### 6. The four promotion preconditions

The compiler refuses to build past these. They are ours, and `cli.ts contract-check` runs them here first:

| Refusal | Why it blocks |
|---|---|
| A glossary term with no **owner** or no **grain** | A term nobody owns is an unanswered question about who decides what it means |
| A competency question with no **persona** or no **evidence** | A question nobody asked is a query we wrote for ourselves |
| A write allow-list entry with no **approver** | Nothing writes because it seemed reasonable at runtime |
| An entity with no **minting system** | Which system creates it decides every join built on it |

Everything merely thin — a question with no template yet, a shape with no exception behind it — is a **warning**. The distinction is the compiler's own and worth keeping exactly: *thinness is visible progress; a missing owner is an unanswered question about who decides.*

---

## Before you hand it over

```bash
node packages/derive/src/cli.ts contract-check engagements/<slug>
```

Exit 1 on a refusal. Every refusal that a person can answer carries a role, and `/next` ranks it above the ordinary findings — a refusal is not advice, it is a build that will not happen.

Then:

```bash
python -m core.importer engagements/<slug>/03-Systems/ontology --instance <slug> --target <jena|databricks>
```

The target comes from `00-Setup/stack-decision.md`. **Choose it from the competency questions, not from precedent** — a triple store earns its place where relationship traversal and per-fact provenance are the point; where the questions are aggregations over known joins, a warehouse with a semantic model on top is less machinery for the same answer.

## Known divergences

- **`business-context.md`.** The compiler's `srcu` example carries one under `docs/00-business/`, and `skills-practice/ontology-first-delivery/reference-architecture.md` lists it. The harness does not scaffold it and the compiler does not require it.
- **The method's own contract table names `use-cases.md` and `shapes/`.** Neither exists in either repo. The flows are `05-Build/spec.md`; the shapes are `entities.shapes`. The table is the thing that is wrong, and it is corrected in `SKILL.md` — this file is canonical where they disagree.
