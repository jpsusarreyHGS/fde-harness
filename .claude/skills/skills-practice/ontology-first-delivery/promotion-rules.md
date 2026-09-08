# Promotion rules

Promotion is moving a candidate from discovery into the ontology repo. It is deliberate, logged and reversible.

## Preconditions

A candidate may be promoted only when all of these hold:

1. **At least one sourced requirement** cites it (`verified`, or `UNVERIFIED` with the operator's explicit acceptance).
2. **Its term is in the glossary** with a definition and a named owner.
3. **Its grain is stated.** "Customer" is not promotable; "Customer — the legal entity holding the master agreement, one per tax id" is.
4. **Its identity rule is known** — which source system mints it, and which systems merely reference it.
5. **At least one competency question needs it.** An entity no question touches is not yet load-bearing.

A candidate failing any of these stays in `ontology-intake/ontology-backlog.md` with the failing precondition named. That note is what makes the backlog useful rather than a graveyard.

## The identity rule

**Get this wrong and every downstream join is wrong**, in a way that surfaces months later and is expensive to unwind.

For each entity, state:

- Which system is authoritative for its existence and its key
- Which systems reference it without minting it
- What the key is, and whether it is stable over time
- What happens when two sources disagree — survivorship, and who adjudicates

Then order the ingestion pipelines so the minting system runs first. This ordering is a hard dependency, not a preference.

State the identity rule explicitly even when it seems obvious. The cases where it seems obvious and is wrong are the expensive ones.

## Grain discipline

Before promoting, answer: **one row of this entity is one what?**

If the answer needs an "or", it is two entities. If two stakeholders give different answers, that is a decision to log, not a detail to average.

The most common failure is promoting an entity at the grain of the source table rather than the grain of the business object. The source system's shape is an implementation detail of the source system, and inheriting it into the ontology exports that system's assumptions into the client's vocabulary permanently.

## The promotion log

Every write into the ontology repo gets a row in `ontology-intake/promotion-log.md`:

| Date | What | Source ids | Repo path | Commit | Approved by |
|---|---|---|---|---|---|

This log is how the requirement traceability map gets assembled, and it is what you show a client who asks why an entity exists. Maintained at write time it costs nothing; reconstructed later it cannot be done accurately.

## Reversal

A promoted object can be wrong. Reversal is:

1. Log the reversal in the promotion log with the reason — never delete the original row.
2. Move the candidate back to the backlog with what was learned.
3. Check what cited it: competency questions, shapes, templates, eval cases, build tasks. Each needs a decision.
4. Report the blast radius to `solution-architect` before removing anything.

**Never silently remove a promoted object.** Something downstream cites it, and a dangling citation is how a build fails in a way nobody can trace.

## Versioning

Once a client system reads the ontology, changes need compatibility handling:

- **Additive** (new entity, new optional property) — safe.
- **Renaming** — needs a migration and a deprecation window. The old term stays in the glossary as a synonym permanently; people will keep using it.
- **Grain change** — this is a new entity, not a change. Treat it as one.
- **Removal** — needs the citation check above plus client sign-off.

Log every change with its compatibility class. A client who cannot tell whether your model change breaks their integration will stop adopting it.
