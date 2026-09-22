---
name: concept-mockup
description: Make the concept mockup — one self-contained HTML page of what the thing could look like, in the HGS app house style (hgs-app-ui, Path B), synthetic data only, every gap in discovery rendered as a labelled assumption for the stakeholder to correct. Stage-agnostic; invoked on the FDE's judgment through /mockup and the concept-mockup agent. Watermarked, versioned, logged.
allowed-tools: Read Write Glob Bash
---

# Concept mockup

## What this is for

The harness stops an FDE building on unearned assumptions. Left alone it also
stopped them cheaply *testing* assumptions with the people who hold the
answers: the first thing a stakeholder ever saw rendered was the MVP. The
concept mockup is the "show them what this could look like" artefact, and it
is built so that showing it **produces discovery** rather than a promise —
every correction a stakeholder makes to it is evidence, captured the same way
an interview is.

It is not the sketch, and not the MVP:

| | `/sketch` | `/mockup` | MVP (`/build`) |
|---|---|---|---|
| Shows | what we **heard** | what it **could look like** | what it **does** |
| Data | accepted rows, badged by class | **synthetic**, plausibly shaped from discovery | real, governed |
| Gaps | do not appear | appear as **labelled assumptions** | are defects |
| When | before G1 | any time the FDE can name what the screen is for | after G1 and stage 04 |
| Register | document (Kanit, brand tokens) | **app** (Geist, hgs-app-ui tokens) | app (hgs-app-ui, Path A) |

## The soft floor — a judgment prompt, not a gate

No minimum artefact set is required. Invoke when there is enough to show.
The one question to answer first: **can you name what the screen is for?** A
workflow, a use case, or a pain point — one of those, named. If you cannot,
you are not ready, and the honest move is `/next`, not a mockup of nothing.

## How it is made

1. **Plan** — code says what the next mockup is and what it rests on:

   ```bash
   node packages/derive/src/cli.ts mockup engagements/<slug> next
   ```

   It prints the version and filename (never guess them), the instruments
   that have accepted rows (what the page may rest on), the instruments with
   nothing (what will have to be assumed), and the coach's top questions —
   the candidates for the assumptions panel.

2. **Read what exists.** `01-Organisation/stakeholder-map.md` and
   `sponsor-brief.md` (who the screen is for), `02-Workflow/operating-map.md`
   and `exception-register.md` (what it does and where it breaks),
   `03-Systems/systems-inventory.md` (what it sits beside), the ontology
   contract files where populated, `04-Placement/` if it exists. Partial is
   fine. **Pending proposals are not read.**

3. **Load the house style** — `.claude/skills/skills-function/hgs-app-ui/`:
   `SKILL.md`, then `references/fallback-primitives.md` (this is **Path B**:
   single file, no npm), `references/page-patterns.md` (pick one of the five
   shapes; do not invent a layout), `references/design-tokens.md`.

4. **Start from `mockup-shell.html` in this directory.** It already carries
   the tokens verbatim, the Geist delivery, the navy chrome, the watermark
   bars, the dimensional contract for every primitive, and the assumptions
   panel. Fill the slots; do not restyle the shell.

   | Slot | Fill with |
   |---|---|
   | `{{APP_NAME}}`, `{{CLIENT}}`, `{{VERSION}}`, `{{DATE}}` | from the plan and the sponsor brief's client name |
   | `{{NAV}}` | one entry per module the workflow implies — usually two to four |
   | `{{PAGE}}` | **one** page shape from `page-patterns.md`: list, record workspace, dashboard, form dialog, or wizard |
   | `{{ASSUMPTIONS}}` | numbered, from the plan's candidates plus whatever you had to invent to draw the page |
   | `{{BUILT_FROM}}` | the plan's "rests on" line, verbatim |

5. **Synthetic data, plausibly shaped.** Names of people are roles or
   invented ("A. Coordinator"). Numbers echo discovery's magnitudes — if the
   volumes export says ~9,000 bookings a month, the KPI says something like
   9,180, not 12. Systems are the ones in the inventory. **Nothing real:** no
   real names from the map, no client record ids, no live connector, no
   fetch. `mockup log` refuses a page that names a person from the map.

6. **Every gap is a callout.** Where you drew something discovery does not
   support — a column, a status, a threshold, an approval step — put
   `<span class="callout">assumed <sup>N</sup></span>` beside it and list N
   in the panel with who can correct it. The panel is the point of the page.
   A mockup with an empty assumptions panel on a stage-02 engagement is a
   mockup that hid its guesses.

7. **Write** to `deliverables/<slug>/mockups/<file from the plan>`, then
   **log it**:

   ```bash
   node packages/derive/src/cli.ts mockup engagements/<slug> log <file> --assumptions "<N — see panel>"
   ```

   This refuses a file without the watermark in header and footer, refuses a
   real name, and writes the ledger row in `05-Build/mockup-ledger.md` with
   what existed when it was built. It prints the two commands for after the
   showing.

8. **After the showing, the reaction is evidence.** What they said goes in
   through `answer` (class `stated`), gets proposed by `/capture`, and the
   ledger row gets `--shown-to`, `--reaction`, `--evidence`. *"Saw v2,
   confirmed direction, 22 Sep"* is the direction-setting decision everything
   downstream builds on — it belongs in the ledger, in the evidence, and in
   `chronicle/memory/decisions.md`. Corrections produce v3; v3 says what
   changed since v2.

## Hard rules

- **Watermark in header and footer, verbatim, not removable by argument:**
  `Concept visualization — not a build commitment or spec`. Stakeholders
  screenshot and forward; the label travels with it.
- **One file, no dependencies** beyond the Google Fonts request, which
  degrades to the stack. It must open in a client conference room with no
  network.
- **Synthetic only.** No real names, ids, records, connectors. The
  client-safe rule applies exactly as to a deliverable.
- **Never read a pending proposal.** Accepted rows or assumptions; nothing
  in between.
- **Path B, all the way.** Hand-written primitives to the dimensional
  contract — 36px controls in any row, `gap` not margins, tokens not hex.
  Do not pull in Tailwind's CDN or a component library; do not mix paths.
- **One page shape.** A mockup that shows four screens shows none of them.
  A second screen is v2.
- **Code mints the version and writes the ledger.** You never type either.

## QA before you hand it back (from hgs-app-ui, Path B additions)

1. Geist rendered — open the file and check the single-storey *a*; if the
   font CDN was blocked, say so.
2. Two controls from different primitives side by side both measure 36px.
3. Toggle `.dark` on `<html>` (the header's moon button): chrome stays navy,
   content re-themes, callouts stay legible.
4. Every callout number has a panel entry and vice versa.
5. `grep -c` the watermark: 2.

## Reading it back

Say what the page shows, in one sentence; how many assumptions it carries
and the top three; what it rests on; and the two commands for after the
showing. Do not say it is "ready to send" — it is ready to be **corrected**,
and the assumptions panel is the part to point the stakeholder at first.
