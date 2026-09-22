---
name: init-engagement
description: One-shot content initialisation for an FDE engagement. Interviews the operator for engagement metadata, then hands the whole scaffold to code — the ten stage folders under engagements/<slug>/, the mirrored deliverables/<slug>/ structure, every starter artefact seeded from .claude/templates/engagement-init/, a Q- for anything left TBD, and the initial state.json. Idempotent, so it also brings an old engagement forward onto new templates.
user-invocable: true
allowed-tools: Read Write Glob Bash AskUserQuestion
---

# Init engagement

**You conduct the interview. Code does the scaffolding.**

That split is deliberate and it is new. This skill used to carry its own
directory list and its own template loop, which meant two implementations of
one thing: the tested code in `packages/derive/src/scaffold.ts`, and prose here
that an agent interpreted. The prose version's `mkdir` block used bash brace
expansion, and this harness's primary shell is PowerShell — which does not
expand brace lists, and instead created a single directory whose name was the
whole comma-separated list.

So there is now one scaffold, and it is the one with tests.

## Step 1 — Gather metadata in one batch

Use `AskUserQuestion` once, not one question at a time. **Put the `means` line
and the example in the prompt for every field** — a trainee who did not know
what "non-goals" meant typed `TBD`, and a field nobody understands is a field
nobody answers.

| Field | Key | Means | Example |
|---|---|---|---|
| Client name | `CLIENT_NAME` | The display name on every artefact | `Caldera Logistics` |
| Slug | *(the folder name)* | kebab-case folder under `engagements/`. Not a JSON field — it comes from the path | `caldera-logistics` |
| Executive sponsor | `SPONSOR` | The person whose definition of success will be judged, and who settles a dispute. Role, and name if known | `Marta Oyelaran, VP Operations` |
| Scope, one line | `SCOPE` | What the pilot is — the workflow, in the client's words, not the technology | `Exception handling on inbound freight bookings` |
| **Where that scope came from** | `SCOPE_SOURCE` | `mandate` / `document` / `recollection` / `tbd`. Every later scope decision is judged against this line; `recollection` is honest and still raises a question | `document` |
| Non-goals | `NON_GOALS` | **What the client has explicitly said this engagement will not do** — replace a system, change a policy, touch a portal. At least one; a scope with no non-goals has not been bounded. If you truly have none, write `none stated — confirm with sponsor` and it becomes a `Q-` | `No rate negotiation. No changes to the customer portal.` |
| Starting stage | `STAGE` | Where the engagement is when you arrive. Almost always `00-Setup` | `00-Setup` |
| Target systems | `SYSTEMS` | The applications the workflow runs through, as the client names them. Comma-separated, or `TBD` | `TMS, Outlook, WhatsApp` |
| Ontology repo | `ONTOLOGY_REPO` | Where the client's approved vocabulary and data model will be published once stage 03 produces it. URL, or `tbd` — a setup question, not a G1 one | `tbd` |
| Target platform | `TARGET_PLATFORM` | The platform the built solution will run on — the compile target: `jena` / `databricks` / `fabric` / `undecided`. Choose from the competency questions once they exist; `undecided` is honest until then | `undecided` |
| Data residency | `RESIDENCY` | Where captured evidence is allowed to live — `client-tenant` / `hgs-tenant` / `tbd`. **Capture cannot start until this is settled** | `client-tenant` |
| Labour representation | `LABOUR` | `works-council` / `union` / `none` / `unknown`. Anything but `none` means observation needs **consultation, not notice** | `union` |

**Do not guess a sponsor or a residency posture.** Both have consequences: one
names who can settle a dispute, the other decides whether capture can legally
begin. Unknown is `TBD`, and the scaffolder turns each `TBD` — and a
`none stated` non-goal — into a `Q-` with an owner. You do not have to write
those yourself.

**You will usually arrive with a brief.** Record what was agreed in
`00-Setup/engagement-mandate.md` and what you believe in
`00-Setup/entry-hypotheses.md` before the first client meeting. The scaffolder
creates both; it cannot fill them, because only you were in the handover.

*(In the target platform this interview is replaced by a web intake form; the
keys are the form's fields.)*

## Step 2 — Write the vars file and run the scaffold

Write the answers as JSON into the scratch directory, then:

```bash
node packages/derive/src/cli.ts scaffold engagements/<slug> --json <vars.json>
```

```json
{
  "CLIENT_NAME": "Northwind Insurance",
  "SPONSOR": "Director, Claims Operations",
  "SCOPE": "First-notice-of-loss triage for motor claims",
  "NON_GOALS": "No adjudication. No customer-facing correspondence.",
  "SYSTEMS": "Guidewire, Outlook",
  "ONTOLOGY_REPO": "tbd",
  "RESIDENCY": "client-tenant",
  "LABOUR": "none"
}
```

Add `--dry-run` first if you want to see what it would create without writing.

What the command does, so you can report it accurately:

- Creates all 22 subdirectories under `engagements/<slug>/`, plus the ten stage
  folders under `deliverables/<slug>/`.
- Seeds all 50 templates from `engagement-init/` and the 8 per-role feedback
  files. **Existing files are never overwritten** — it reports them as already
  present.
- Raises a `Q-` for each of `SYSTEMS`, `RESIDENCY`, `LABOUR` and
  `ONTOLOGY_REPO` left unresolved, with who can answer and what it blocks.
  Only on a first run: re-running does not duplicate them.
- Derives `state.json` from the tree rather than hand-writing it.
- **Exits 1 if any `{{PLACEHOLDER}}` survives anywhere in the engagement**, and
  names the file. That is the one failure worth stopping for: a placeholder in
  a live instrument is a value nobody supplied, sitting where a reader will
  take it for content.

It refuses, with exit 2, on a missing required field, an out-of-range
`RESIDENCY` or `LABOUR`, or a `SLUG` in the JSON that disagrees with the path.

## Step 3 — Report

Repeat what the command printed: directories, files written, files already
present, the `Q-` ids raised, and any surviving placeholder.

If it exited non-zero, **say so plainly and do not describe the engagement as
ready.**

Then tell the operator the two things that must happen before capture: **sign
the evidence-handling terms**, and **check the monitoring constraint** if labour
representation is anything other than `none`. Desktop task mining and session
replay are employee monitoring; in works-council and unionised environments
they require consultation, not notice.

## Bringing an old engagement forward

The same command. It is idempotent by construction, so running it on a live
engagement backfills anything a newer template added and touches nothing else:

```bash
node packages/derive/src/cli.ts scaffold engagements/<slug> --json <vars.json> --dry-run
```

Read the dry run, then drop the flag.

## What is correct at init, and looks wrong

**Almost every count is zero and almost every instrument is `empty`.** That is
the honest picture and the dashboard should show it. An engagement that looks
half-populated at init has been seeded with fake numbers.

The exceptions are real, not defects: stage `00` reports partial coverage
because residency and the other setup fields are genuinely answered, and stage
`02` moves off zero when `Q-` rows are raised — a question is content.
