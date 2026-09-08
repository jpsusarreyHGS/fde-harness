---
description: Invoke the ontology-engineer to promote discovery output into the client domain model. Assembles the 03-Systems/ontology contract layer (glossary, personas, competency questions, use cases, source systems) then models entities, relationships, shapes and governed query templates into the ontology repo. Audits the evidence chain first and stops if the model would be speculative.
allowed-tools: Read Write Glob Grep Bash Agent
---

Use the Agent tool to dispatch the `ontology-engineer` agent. Follow its instructions exactly. Per `ontology-engineer.md`:

1. **Loads `ontology-first-delivery` and `requirements-elicitation` first**, plus the target ontology repo's own `CLAUDE.md` and `docs/00-business/` — repo conventions are authoritative and are never inferred from filenames.
2. **Audits the evidence chain before modelling anything** — unsourced requirements, unjustified backlog candidates, ownerless vocabulary terms, exceptions with no captured rule. If the chain is broken badly enough to make the model speculative, it stops and reports what discovery must close.
3. **Assembles `03-Systems/ontology/` in dependency order** — glossary → personas → competency questions → use cases → source systems. Each maps 1:1 onto the ontology repo's `docs/00-business/` layer.
4. **Models** entities and relationships, shapes derived from the exception register, one read template per `CQ-NN`, and write templates with provenance and an approver role.
5. **Logs every promotion** to `03-Systems/ontology/promotion-log.md` with the `REQ-`/`EV-` ids behind it — this is what builds the traceability map and what you show a client who asks why an entity exists.
6. **Emits an ONTOLOGY PAUSED block** with the chain audit, competency-question coverage, and decisions needing a named owner.

The governance invariant is not negotiable: **the model never emits query text; only registered templates execute.** If a use case appears to need free-form query generation, the agent escalates it as a design finding.

The agent never drafts an entity from a blank page. Anything with no requirement behind it is parked in `03-Systems/ontology/backlog.md` with a note on what evidence would justify it.
