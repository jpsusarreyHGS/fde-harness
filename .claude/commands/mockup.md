---
description: Any stage, on your judgment. Invoke the concept-mockup agent to render one self-contained HTML page of what the solution could look like — HGS app house style, synthetic data only, every discovery gap shown as a labelled assumption for the stakeholder to correct. Watermarked, versioned, logged in 05-Build/mockup-ledger.md. The reactions it draws are evidence. Not a spec, not a build commitment, not the MVP.
allowed-tools: Read Write Glob Grep Bash Agent
---

**Before dispatching, run the pre-flight.** If it exits non-zero, show its message and stop — do not dispatch.

```bash
node scripts/preflight.mjs engagements/<slug>
```

Use the Agent tool to dispatch the `concept-mockup` agent. Name the engagement, and pass whatever the operator said the screen is for — a workflow, a use case, a pain point. Per `concept-mockup.md`:

1. **Loads its skills first** — `concept-mockup`, then `hgs-app-ui` on **Path B** (single file, no npm), then `evidence-handling`, plus any superseding engagement skill.
2. **Plans with code** — `cli.ts mockup <dir> next` gives the version, the filename, what the page may rest on and what it will have to assume. The agent never chooses the number.
3. **Asks the one question** — can it name what the screen is for? If not, it reports that and names the two `/next` conversations that would change it. That is a judgment, not a gate; you may overrule it.
4. **Lists the assumptions before drawing** — the coach's open questions plus everything it must invent to draw one page shape — and renders each as a numbered callout on the page with the panel beside it.
5. **Writes one file** from `mockup-shell.html` — tokens, Geist, navy chrome, watermark in header and footer — with synthetic data shaped to discovery's magnitudes. No real names, ids, records or connectors.
6. **Logs it** — `cli.ts mockup <dir> log <file>` refuses a page without the watermark or with a real name, and writes the ledger row with what existed when it was built.
7. **Emits a MOCKUP block** and stops.

**After the showing, capture the reaction as evidence.** When the operator reports what the stakeholder said, offer the two commands pre-filled — `answer` for the words, `mockup log --shown-to --reaction --evidence` for the ledger — and do not move on until they accept or decline. *"Saw v2, confirmed direction, 22 Sep"* is the direction-setting decision everything downstream builds on; record it in `chronicle/memory/decisions.md` too.

This is not `/sketch` (what we heard, evidence-badged, pre-G1) and not `/build` (the MVP, after the gates). It is the cheap way to be wrong in front of the people who know — which is the point.
