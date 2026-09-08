---
name: ontology-first-delivery
description: The practice's ontology-first delivery method — why the domain model comes before the build, what promotion from discovery to ontology requires, the discovery-to-ontology artefact contract, competency questions as the ontology's acceptance test, and the governed-template invariant that keeps an agent safe over a client graph. Read before any modelling, promotion, or design of the 03-Systems/ontology contract layer.
---

# Ontology-first delivery

## Why the model comes first

Every organisation names the same real-world thing differently by function — and frequently at different grains. Sales' "account" is Finance's "billing entity" is Operations' "site", and none of them are the same set of rows. This is why integrations break weekly and nobody can find the cause.

Solving that once per client is unavoidable. Solving it with a reusable layer is what turns it into an asset.

The commercial argument is stronger than the technical one: **a client who adopts your vocabulary has adopted something far harder to displace than any individual workflow you automate.** Becoming the linguistic foundation of how an organisation describes its own work is the most durable position an FDE practice can hold.

## The order of operations

```
observe → capture vocabulary verbatim → source requirements → promote entities
   → write competency questions → model → validate with shapes → govern access
```

**Never draft an entity from a blank page.** An entity with no requirement behind it is a guess about the client's business dressed up as a design artefact, and it will be defended in review because it is written down.

If you find yourself modelling something you cannot trace to a `REQ-`, park it in `03-Systems/ontology/backlog.md` with a note on what evidence would justify it. The backlog is not a rejection — it is where a candidate waits for the observation that earns it.

## The discovery-to-ontology contract

The reference implementation is `Abishek-Hariharan-HGS/AI_Ontology_Credit_Union`. Its `docs/00-business/` layer is the contract, and **the load-bearing insight is that this layer is a discovery deliverable, not a modelling artefact.** It is filled from the field.

| Discovery artefact | Contract file | Becomes |
|---|---|---|
| `chronicle/memory/client-vocabulary.md` | `glossary.md` | Approved terms, synonyms, owners |
| `01-Organisation/stakeholder-map.md` | `personas.md` | Roles + permission matrix → the app's role module |
| `02-Workflow/open-questions.md` + observed asks | `competency-questions.md` | One governed read template per question |
| `04-Placement/prioritisation.md` | `use-cases.md` | Flows + the write allow-list → governed write templates |
| `03-Systems/systems-inventory.md` | `source-systems.md` | Field mappings + identity rules → the ingestion pipelines |
| `02-Workflow/exception-register.md` | `shapes/` + golden sets | Validation constraints + eval cases |

Assemble these in `03-Systems/ontology/` in dependency order, then promote. `promotion-rules.md` carries the mechanics; `reference-architecture.md` carries the repo's structure and conventions.

## Competency questions are the acceptance test

A competency question is a question the client's people **actually ask**, expressed as something the model must be able to answer.

Rules:

- **Every question names the persona who asks it and the evidence that they ask it.** A question nobody asked is a query you wrote for yourself. Cut it.
- **Number them `CQ-NN`.** Read templates, eval cases and the traceability map all cite these.
- **"Answerable" means you ran it.** Not that the entities exist and it should work. Coverage claimed without execution is the most common way an ontology passes a gate it should have failed.
- A question the model cannot answer is either a modelling gap or a data gap, and **which one it is must be stated.** They have completely different remedies and completely different costs.

## Naming: the client's words win

Capture terms verbatim. Where two functions use different words for the same thing, both appear as synonyms and **the canonical choice is a logged decision with a named approver, not the modeller's preference.**

Where the same word is used at different grains, **that is two terms**, and naming them apart is often the single most valuable thing the engagement delivers. The client has been having a recurring argument that nobody could resolve because both sides were right about different things.

Do not normalise into industry-standard vocabulary without logging it as a decision. Their words are the asset; your words are a migration cost you are asking them to absorb.

## Shapes come from exceptions

The exception register is the highest-value input to validation. Every exception that represents an invalid state becomes a constraint, and every constraint you can express is a class of bad data that never enters the graph.

This is the concrete reason discovery treats exceptions as first-class objects rather than a column on a process map: they are simultaneously the validation spec and the eval golden set.

## The governed-template invariant

Non-negotiable, inherited from the reference architecture, and the thing that makes an agent over a client graph defensible:

- **The model never emits query text.** Only registered templates execute.
- **Client-supplied query text is never run.** Ever.
- **Every parameter is validated and escaped** before reaching a template. Anything embedded in an identifier uses a typed parameter, never a raw string.
- **Role comes from the authenticated session only** — never from client input, a header, or a request body.
- **Writes never commit inside the agent loop.** A write produces a signed, expiring proposal; approval re-binds the template from scratch and re-checks the role before executing.
- **Every read and write is audited**, degrading to logs rather than silently skipping.

If a use case appears to need free-form query generation, that is a design finding to escalate — not a licence to relax the invariant. In practice the requirement is almost always satisfiable with a better-parameterised template, and the times it is not are times the client needs to make an explicit risk decision.

## Scope boundary

State plainly what the graph is **not**. In the reference implementation the graph is insight, not a system of record: money movement, balances of record and identity verification are out of scope, and the agent may assemble evidence for a decision but never make the decision.

Every engagement needs its own version of this sentence, agreed early and enforced in the system prompt. Without it, scope expands into the space where a wrong answer has consequences, and it expands quietly.
