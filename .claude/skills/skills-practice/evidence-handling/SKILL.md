---
name: evidence-handling
description: Consent, residency, retention, redaction and monitoring law for FDE field capture. Read BEFORE any observation, recording, task mining, session replay or data extract — the terms must be settled before capture begins, not after procurement asks. Covers the works-council and unionised-environment constraint that ends engagements rather than delaying them.
---

# Evidence handling

## The rule

**Settle the handling terms before capture begins.** Not before the readout, not before procurement asks — before the first observation session.

This is not caution for its own sake. Evidence captured under unresolved terms may have to be destroyed, and destroying your discovery evidence means redoing discovery. It is also the moment when a client's security and legal functions form their view of whether HGS is safe to work with, and that view is very hard to revise.

Write the agreed terms to `00-Setup/evidence-handling-terms.md`. The `discovery-analyst` **hard-stops** if that file is missing or unsigned.

## The six terms

| Term | The question | Default posture |
|---|---|---|
| **Residency** | Which tenant holds captured client evidence — ours or theirs? | Client tenant unless they ask otherwise |
| **Retention** | How long do we keep it, and what happens at engagement close? | Defined period, deletion at close unless renewed |
| **Redaction** | What must be stripped before it leaves the client environment — names, account numbers, customer data? | Redact by default; carry identifiers only where the analysis needs them |
| **Access** | Who on the HGS side may read it? Named individuals or a role? | Named engagement team only |
| **Deletion** | What is the mechanism, who confirms it, what is the evidence of deletion? | Documented, confirmed in writing |
| **Onward use** | May a generalised pattern go to the practice asset library? | Yes, only after generalisation strips all identifying material |

That last term is the one teams forget to ask for and then need. Ask at the start, while goodwill is high and the request is abstract.

## Monitoring: the constraint that ends engagements

**Desktop task mining and session replay are employee monitoring, whatever the vendor's deck calls them.**

In EU works-council jurisdictions and unionised environments they require **consultation, not notice.** These are different obligations: notice is telling people; consultation is a process with a counterparty who can say no, and it takes weeks.

Getting this wrong does not delay an engagement, it ends one — and it damages the account relationship well beyond the engagement. Check jurisdiction and labour representation before proposing any always-on instrumentation, and settle it alongside the residency terms.

**Where there is doubt, prefer consented, time-boxed shadowing over always-on capture.** It produces better material anyway: an operator who knows why you are there and agreed to it will show you the exception, and an operator who discovered they were being recorded will not.

## Observation consent, practically

Even where no formal consultation is required:

- The operator knows who you are, why you are there, and what happens to what you capture.
- Record roles rather than names by default. Where a name is needed — the holder of an undocumented rule, for instance — capture it and note that consent covers it.
- The operator can pause you. Say so at the start, and honour it without asking why.
- Verbatim quotes are attributed to a role, not a person, in anything that leaves the engagement folder.

The operator holding the undocumented rule is the most valuable source in the engagement, and often the most exposed — the rule exists because the official process is inadequate, and surfacing it can look like surfacing a workaround they are responsible for. **Protect them explicitly**: frame the rule as a process finding, never as individual behaviour.

## Handling in the harness

- **`datasources/` is read-only.** Convert, extract and derive into the engagement folder; never write back.
- **Converted binaries go to a temp file in the engagement folder, are read, then deleted.** Do not leave conversions lying around — they are unredacted copies of client material outside the intended store.
- **`chronicle/memory/environment.md` records where credentials live, never their values.** If you find a credential in a file, stop, report it, and do not commit.
- **Nothing client-identifying enters `skills-practice/` or `.claude/templates/`.** Generalisation is a deliberate step at engagement close, run by `harness-improver` in `engagement-close` mode.

## At engagement close

1. Execute the retention term — delete or transfer per the agreement.
2. Confirm deletion in writing to the client contact named in the terms.
3. Run the generalisation pass. Anything promoted to the asset library has names, volumes, system identifiers and anything else identifying stripped first.
4. If a pattern cannot be generalised without losing what made it useful, leave it in the engagement and say so. A useful pattern that identifies a client is not an asset, it is a liability.
