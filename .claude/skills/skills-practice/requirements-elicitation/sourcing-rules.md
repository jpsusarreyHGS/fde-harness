# Sourcing rules

## What counts as a source

A source is a **specific, retrievable piece of evidence**: an `EV-` row in the observation log, an `EX-` row in the exception register, or a file under `02-Workflow/evidence/` with a stable name.

These do not count as sources:

- "Discovery" — which part?
- "The client said" — who, when, and is it logged as an `EV-` row?
- "Standard practice" — for whom? That is an assumption about the client's business.
- "Obvious from the workflow" — then cite the workflow rows it is obvious from.
- Another requirement — requirements do not source each other. If `REQ-014` implies `REQ-015`, both cite the underlying evidence.

## The chain, in both directions

```
EV-NNN / EX-NNN  →  REQ-NNN  →  ontology object  →  CQ-NN  →  eval case  →  build task
```

**Forward:** every piece of evidence should either produce a requirement or be explicitly noted as context. Evidence that produced nothing is either a gap in the analysis or a signal the observation was not needed.

**Backward:** every requirement, object, question, case and task cites its parent. A dangling citation is a defect you can grep for. A missing citation is one you cannot.

## Auditing the chain

Run this before any gate, and before `ontology-engineer` models anything:

1. **Unsourced requirements** — rows with no `Source:`. These block modelling.
2. **Orphan evidence** — `EV-`/`EX-` ids cited nowhere. Usually means an instrument was written and never used.
3. **Dangling citations** — a `Source:` pointing at an id that does not exist. Usually a renumbering that should never have happened.
4. **Stale `UNVERIFIED`** — stated-only requirements older than the current phase. These are the ones that surface at UAT.
5. **Unowned assumptions** — an `ASSUMPTION` with no owner or no confirmation date is a guess with a permanent home.

Report counts, not just a pass/fail. "43 of 51 requirements sourced" is actionable; "sourcing incomplete" is not.

## Assumption hygiene

Assumptions are legitimate — you cannot observe everything, and an engagement that refuses to proceed without total evidence does not proceed. What makes them safe is that they are **labelled, owned and dated**.

Every `ASSUMPTION` row carries:

- The assumption, stated positively (not "we assume X is not a problem")
- A named owner who can confirm or refute it
- A confirmation-by date
- What breaks if it is wrong

That last field is what turns an assumption into a managed risk. An assumption whose failure mode is unstated cannot be prioritised, and it will be confirmed last.

Mirror every open assumption into the RAID log. `engagement-manager` reviews them at each gate.
