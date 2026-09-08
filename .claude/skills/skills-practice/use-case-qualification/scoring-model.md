# Scoring model

Seven dimensions, 1-5. Use these bands verbatim rather than inventing weights — the point of a fixed model is comparability across engagements.

## Value

| Score | Band |
|---|---|
| 5 | Moves a metric the sponsor is personally measured on, with a baseline we measured ourselves |
| 4 | Clear operational gain, baseline available from client data |
| 3 | Plausible gain, baseline would need to be established |
| 2 | Gain asserted by stakeholders, no baseline |
| 1 | No agreed measure of success |

**A value score above 3 requires a baseline in `value-hypothesis.md`.** Capture baselines while the current state is still observable — after the build, the "before" number is gone and the whole business case becomes an argument.

## Feasibility

| Score | Band |
|---|---|
| 5 | Buildable with existing connectors and patterns, inside the pilot window |
| 4 | One new integration or pattern needed, well understood |
| 3 | Multiple new pieces, or a dependency on a client team's delivery |
| 2 | Needs client platform change, or an unproven approach |
| 1 | Blocked on something outside the engagement's control |

**Capped at the data-readiness score.** Always.

## Data readiness

| Score | Band |
|---|---|
| 5 | Available, accessible today, quality verified by us |
| 4 | Available, access path agreed, quality spot-checked |
| 3 | Exists, access requires a process we have started |
| 2 | Exists, access unresolved, or quality unknown |
| 1 | Does not exist, or is not extractable |

A score of 3 or below requires a **named blocker and a named owner**. An amber with no blocker is a green you have not justified.

## AI suitability

| Score | Band |
|---|---|
| 5 | Judgment over messy, heterogeneous context; the rule lives in someone's head (evidence in the exception register) |
| 4 | Mostly judgment, some deterministic steps |
| 3 | Mixed; a rules engine plus a judgment layer |
| 2 | Largely deterministic, documented rules |
| 1 | Fully deterministic — build it as software |

Cite the `EX-` ids that evidence the judgment. Undocumented operator judgment is the strongest signal on this dimension.

## Risk

Score the **residual** risk after the human gate, and state the gate.

| Score | Band |
|---|---|
| 5 | Wrong answer is visible and cheap; human gate before any consequence |
| 4 | Wrong answer is recoverable, gate on writes |
| 3 | Wrong answer costs rework; gate exists but is a bottleneck |
| 2 | Wrong answer has customer or financial impact; gate is advisory |
| 1 | Wrong answer has regulatory, safety or irreversible consequence |

**Score 1 or 2 requires an explicit operator decision to proceed**, logged in `decisions.md`. Do not let a high value score carry a 1 here silently.

## Time to value

| Score | Band |
|---|---|
| 5 | Something real and visible in under two weeks |
| 4 | Under four weeks |
| 3 | Within the pilot window |
| 2 | Beyond the pilot window |
| 1 | No credible date |

## Reusability

| Score | Band |
|---|---|
| 5 | Produces a connector, ontology pack or module that a named account in the pipeline would use |
| 4 | Pattern generalises to a known segment |
| 3 | Some assets generalise; core is bespoke |
| 2 | Mostly bespoke, one or two reusable pieces |
| 1 | Bespoke forever |

Name the account or segment for a 4 or 5. An unnamed reuse claim is speculation, and speculative reuse is how an asset library fills with things nobody uses.

## Ranking

Rank on total, then apply these overrides in order:

1. **Any dimension at 1 goes to a separate "blocked or deferred" list**, whatever the total. A 1 is a stop, not a low score to be averaged away.
2. **Risk at 1 or 2 requires a logged operator decision** before the candidate can be ranked at all.
3. **Where totals are within 2 points, prefer the higher time-to-value.** An FDE engagement's credibility is built by shipping something real early, and a marginally better second choice that ships in week two beats a marginally better first choice that ships in week nine.

Report the total, the per-dimension scores, and which overrides fired.
