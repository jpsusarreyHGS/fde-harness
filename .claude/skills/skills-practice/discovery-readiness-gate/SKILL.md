---
name: discovery-readiness-gate
description: The G1 gate — the seven criteria that decide whether discovery is done and design may begin, how to assess each with evidence rather than assertion, and the failure modes that make a gate memo look green when it is not. Read before producing or reviewing a G1 readiness memo, or when asked whether discovery is complete.
---

# Discovery readiness gate (G1)

## What this gate is for

It **blocks build until discovery holds.** Not until discovery feels thorough, or until the discovery budget is spent, or until the sponsor is keen to see something — until seven specific things are true and evidenced.

An engagement that passes G1 on optimism spends the build phase rediscovering requirements at ten times the cost, and the sponsor experiences that as HGS being slow.

The `engagement-manager` produces the memo. **The operator decides.** Nothing in this skill makes the decision.

## The seven criteria

### 1. Named executive sponsor, aligned

Not a title — a person, who has stated what success looks like in their own words, and whose stated version matches the value hypothesis.

**Evidence:** `01-Discovery/stakeholder-map.md` with the sponsor named, plus their success statement recorded.

**Failure mode:** a sponsor who delegated the engagement and has not engaged. The pilot will be delivered to someone who never wanted it. If the sponsor cannot articulate the outcome, that is not met, whatever the org chart says.

### 2. Bounded scope with explicit non-goals

**The non-goals are the load-bearing half.** A scope statement with no non-goals has not been bounded — it has been described.

**Evidence:** the pilot charter, with a non-goals section that names things a reasonable person would otherwise have expected.

**Failure mode:** non-goals that are all obviously out of scope. If nothing in the list would disappoint anyone, the boundary has not been drawn where the argument is.

### 3. Defined value with a measured baseline

A metric, a baseline number **we measured**, a target, a named metric owner, and a measurement cadence.

**Evidence:** `01-Discovery/value-hypothesis.md`.

**Failure mode:** a baseline taken from a client dashboard nobody has validated, or a target with no baseline at all. **Capture the baseline while the current state is still observable** — after the build the "before" number is gone, and the business case becomes an argument you cannot win.

### 4. Feasible data

For every source the top-ranked use case needs: available, access path agreed, quality spot-checked by us, and blockers named with owners.

**Evidence:** `01-Discovery/data-readiness.md`.

**Failure mode:** "IT has confirmed access is possible." Possible is not agreed, and agreed is not provisioned. This is the criterion most often marked met on the strength of a verbal assurance, and it is the one that most often costs the pilot its first three weeks.

### 5. Known risks

Every risk with an owner, an impact, and a mitigation or an accepted-by name.

**Evidence:** `engagement-management/raid-log.md`.

**Failure mode:** a risk register of generic project risks. Where are the risks specific to *this* client's data, systems, labour environment and regulatory exposure? A register with nothing uncomfortable in it has not been written honestly.

### 6. Agreed acceptance criteria

The top-ranked use case's requirements have acceptance criteria that can fail, and the client has seen them.

**Evidence:** `01-Discovery/requirements-register.md`, with an AC per `must` requirement.

**Failure mode:** acceptance criteria HGS wrote and the client has not read. An unseen AC is not agreed, and it will be renegotiated at the moment it matters most.

### 7. Settled evidence-handling terms

All six terms agreed, and monitoring constraints checked against jurisdiction and labour representation.

**Evidence:** `01-Discovery/evidence-handling-terms.md`, signed.

**Failure mode:** capture already underway on the assumption this would be fine. If this criterion is not met, it is the most urgent thing in the engagement.

## Assessing honestly

Per criterion: **met / not met / partially met**, with the evidence path, and — where not met — what specifically closes it and who owns that.

Three anti-patterns to check for in your own draft:

- **All green on first pass.** On a real engagement this almost always means the memo was written from intent rather than evidence. Re-check the weakest criterion, and check criterion 4 twice.
- **"Partially met" used as a soft pass.** Partially met is only meaningful with a stated remainder and an owner. Without those it is "not met" with better manners.
- **Evidence paths that point at a file rather than a fact.** "See requirements-register.md" is not evidence that ACs exist. Cite the rows.

## Coverage is not readiness

Discovery coverage — how many instruments are populated — is not what this gate measures. An engagement can have a full observation log, a rich exception register and a complete system landscape and still fail G1 on an unnamed sponsor or unprovisioned data access.

Conversely, thin instruments can pass if the top-ranked use case is genuinely well understood and narrowly bounded. **The gate is about the readiness of the next step, not the completeness of the last one.**

Report both, separately, and do not let one stand in for the other.
