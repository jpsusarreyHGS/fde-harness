# Capture formats

Canonical row shapes for the discovery instruments. Templates in `.claude/templates/engagement-init/02-Workflow/` implement these; keep the two in sync.

## Observation log

| Field | Rule |
|---|---|
| `EV-NNN` | Stable id. Never renumber — everything downstream cites it. |
| Timestamp | Local time, `HH:MM:SS`. Relative offsets are acceptable if the session start is recorded. |
| Actor | Role, not name, unless the name is needed and consent covers it. |
| Action | What was done, in the operator's words where possible. |
| System | Where it happened. |
| Duration | Seconds. `—` if not measured; never estimate silently. |
| Interrupted by | What broke the flow, if anything. |
| Tell | `repeat` / `paste` / `switch` / `dead` / `—` |
| Class | `observed` / `system` / `documented` / `stated` |
| Notes | Verbatim quotes belong here, in quotation marks. |

## Exception register

| Field | Rule |
|---|---|
| `EX-NNN` | Stable id. Cited by shapes and eval cases. |
| Trigger | What makes this case leave the happy path. |
| Frequency | A rate with a window, or the literal string `unquantified`. Never a word like "often". |
| Current handling | What actually happens today. |
| **Rule holder** | The named role who knows what to do. **The most important column in the engagement.** |
| Rule, verbatim | Their words, in quotation marks, before any paraphrase. |
| Source | `EV-` ids. |
| Downstream | Shape id / `CQ-NN` / eval case id, once promoted. |

An exception with no rule holder is an open question, not a blank cell.

## Requirements register

| Field | Rule |
|---|---|
| `REQ-NNN` | Stable id. |
| Statement | One requirement per row. If it contains "and", consider splitting it. |
| `Source:` | One or more `EV-` / `EX-` ids. **Mandatory.** No source means it is not a requirement. |
| Class | `functional` / `data` / `integration` / `security` / `operational` |
| Confidence | `verified` (observed or system evidence) / `UNVERIFIED` (stated only) / `ASSUMPTION` (no evidence, named owner required) |
| Acceptance criteria | Expected/actual pairs a person could execute. "Works correctly" is not one. |
| Priority | `must` / `should` / `could` — against the pilot charter, not in the abstract. |
| Owner | Who confirms it. |

## Open questions

| Field | Rule |
|---|---|
| `Q-NNN` | Stable id. |
| Question | Specific enough to be answered in one sitting. |
| Why it matters | What decision it unblocks. |
| Who can answer | A named role. "The client" is not an answer. |
| Blocks | The artefact or slice waiting on it. |
| Raised / Answered | Dates. An open question with no raised date cannot be aged. |

Rank by what is blocked, never by analyst curiosity.

## Id discipline

- Ids are **append-only and never reused**, even after a row is deleted. A deleted row is struck through with a reason, not removed — a citation that dangles is a defect you can find, while a silently renumbered id is one you cannot.
- Ids are per-engagement, not global.
- Every downstream artefact cites upstream ids. That citation chain is the requirement traceability map, and it is assembled for free if it is maintained at write time.
