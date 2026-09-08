# Reference architecture

The practice's reference ontology implementation is `Abishek-Hariharan-HGS/AI_Ontology_Credit_Union`. Read its `CLAUDE.md` before writing into it or into a repo derived from it — **repo conventions are authoritative and are never inferred from filenames.**

## Shape

```
docs/00-business/     the SME layer — every artefact traces back to it
  business-context.md      institution, goals, scope, principles
  personas.md              roles + permission matrix
  competency-questions.md  the ontology's acceptance test
  use-cases.md             end-to-end flows + the write allow-list
  source-systems.md        sources, field mappings, identity rules
  glossary.md              terms + controlled vocabularies
docs/01-architecture/ system + deployment architecture
ontology/             core + domain models, shapes/ for validation
data/seed/            demo instance graph
data/sources/         sample raw extracts, one folder per source
pipelines/            per-source mappers + validate + load
sparql/queries/       governed read templates, 1:1 with competency questions
sparql/updates/       governed write templates — the agent write allow-list
app/                  assistant surface over governed templates only
```

## The properties worth copying

**1. The business layer is first and load-bearing.** Not documentation of the model — the source of it. Every downstream artefact traces back, and the repo says so explicitly. This is the property that makes the whole thing auditable.

**2. Competency questions map 1:1 to read templates.** One question, one template, named for the question. Coverage is therefore countable rather than asserted, and a question with no template is visibly missing.

**3. Writes are an explicit allow-list.** The set of things an agent may change is enumerated in the repo, derived from approved use cases, and each one names an approver role. Nothing writes because it seemed reasonable at runtime.

**4. Validation gates the load.** Instance data is validated against shapes before it enters the store. A build that has not passed validation is not built.

**5. Provenance on every fact.** Each source contributes an activity record, so any fact can be attributed. This is what lets you answer "where did this number come from" without a forensic exercise.

**6. Typed identifiers, centrally defined.** Identifier construction lives in one helper module that the pipelines and the app both use. Divergent identifier logic between ingestion and query is a class of bug that is very hard to see and very easy to prevent.

**7. Two mirrors of the template registry, deliberately kept in sync.** The governance source of truth lives as files in the repo; the runtime registry mirrors it. The repo states the sync obligation explicitly rather than leaving it implicit — which is the only reason it holds.

## Adapting it to a new domain

The stack is a choice; the structure is the asset. When starting a new client ontology:

1. **Keep `docs/00-business/` verbatim as a structure** — the six files, in that order. Fill them from discovery.
2. **Keep the 1:1 competency-question-to-read-template rule.** This is the property that makes coverage measurable.
3. **Keep the write allow-list and the two-phase write.** These are the properties that make the agent safe.
4. **Keep the validation gate before load.**
5. **Replace the domain model, the sources and the shapes entirely.** Reusing another client's entities is how you deliver their business to this client.
6. **Re-decide the store.** A triple store earns its place where relationship traversal and per-fact provenance are the point. Where the questions are aggregations over known joins, a relational or warehouse layer with a semantic model on top is less machinery for the same answer. Choose from the competency questions, not from precedent.

## Deployment note

The reference repo separates the app tier from the store tier deliberately, and documents why. Read that reasoning before proposing a topology — the constraint that drove it is common and easy to rediscover the expensive way.
