---
name: render-sketch
description: Render the pre-G1 alignment sketch — "here is what we think we heard; is it right?" — as one self-contained, HGS-branded HTML page built only from accepted rows, each carrying its evidence class, under a PROVISIONAL banner. Operator-invoked via /sketch. Code renders it; this skill says what it is for and what it must never do.
allowed-tools: Read Bash
---

# Render sketch

## What this is for

Before G1, nothing in `deliverables/` is allowed to exist — the allocation
grid, the architecture and the readout all rest on a gate discovery has not
passed. That is correct, and it left a hole: a compressed engagement with one
day of discovery and a client waiting had nothing to put in front of people.
In the first field simulation all three trainees built an alignment page by
hand, outside the harness, and one of them leaked names and internal
constraints into it.

The sketch is that page, made by code from the registers. Its purpose is one
sentence: **here is what we think we heard — is it right?** It is shown to be
corrected, not approved.

## How it is made

```bash
node packages/derive/src/cli.ts sketch engagements/<slug>
```

`packages/derive/src/sketch.ts` reads the accepted rows and writes
`deliverables/<slug>/sketch/<date>.html`. Five fixed sections, each populated
only from register rows and each carrying its evidence class:

| Section | From | Badge |
|---|---|---|
| **What we heard** | the sponsor's sentence (`sponsor-brief`) and `operating-map.steps` | per step: `observed` · `system` · `documented` · `stated`, resolved through the `Source` column's observation-log rows; `unverified` when it cites none |
| **Where the work is lost** | `exception-register.rows` and `operating-map.dead-ends` | class as above; `unquantified` when the frequency is |
| **What we do not yet know** | the coach's queue, grouped by who can answer | — |
| **Constraints we have already found** | `readiness-scorecard.rows` with a blocker, and `.blockers` | — |
| **What this is not** | one fixed paragraph | — |

`state.json` lists every sketch under `sketches[]`, separately from
`deliverables[]`, so the dashboard can show it without mistaking it for a
rendered deliverable.

Brand tokens are inlined from `assets/hgs-brand-tokens.css`; the page stands
alone on a client laptop. The banner is Orange — an alert colour, on purpose.

## Four rules

1. **Accepted rows only.** Pending proposals are not read. A step with no
   accepted row does not appear. If the page is sparse, the page is sparse —
   that is the honest picture, and the route to more is `/capture` and accept.
2. **The sketch never invents.** No filled gaps, no smoothed wording, no
   "typical" steps. An honest sparse sketch is the product.
3. **`PROVISIONAL — pre-G1 alignment sketch` is in the header and the
   footer and is not removable by argument.** If the operator wants it gone,
   the answer is `/gate 1` and then `/render`.
4. **Client-safe by construction.** Body text carries no harness ids
   (`EV-`, `EX-`, `Q-`, `REQ-`), no `Source:` lines, and roles rather than
   the names in the stakeholder map. The client-safe pass from
   `render-deliverables` applies to it as to every deliverable.

## What to say when reading it back

Repeat the counts the command printed and name every empty section. Do not
offer to fill one. If the operator asks whether it is ready to send, the
answer is that it is ready to be *corrected* — and that the evidence badges
are the part to draw the client's eye to, because a page of `stated` lines is
a request to go and watch.
