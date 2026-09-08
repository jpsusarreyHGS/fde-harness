---
description: Stage 05. Invoke the solution-architect in architect mode to produce the target architecture, the canonical Mermaid diagram, and the access model. Drafts six chunks in order — context and constraints, target architecture, integration map, access model, autonomy plan, deployment and operations — pausing between each for operator review.
allowed-tools: Read Write Glob Grep Bash Agent
---

Use the Agent tool to dispatch the `solution-architect` agent in **`architect` mode**. Follow its instructions exactly. Per `solution-architect.md`:

0. **Step 0 orientation and gate (always first)** — emits the ARCHITECT STATUS dashboard with upstream readiness, detected conflicts and per-chunk status, then stops. Does not draft while a conflict is unresolved. If G1 has not passed it asks before proceeding, and logs any operator override as a decision.
1. **Context and constraints** — what the pilot must fit inside. **Build on top of what the client already runs**; proposing a replacement for a platform they spent years migrating to is how an FDE engagement dies.
2. **Target architecture** — components, data flow, where the ontology, the agent and the human gates sit. Mermaid source into `05-Build/architecture-diagram.md` as the canonical file.
3. **Integration map** — per source: extract method, auth, refresh, owner, failure behaviour, and which coverage claims were actually verified.
4. **Access model** — roles x objects x operations from `03-Systems/ontology/personas.md`. Every write names an approver role.
5. **Autonomy plan** — target rung per workflow **and the measurement that earns it**, written now so it cannot be renegotiated later under delivery pressure.
6. **Deployment and operations** — environments, promotion path, where secrets live (never values), rollback, observability, on-call.

Writes `05-Build/architecture.md`, `architecture-diagram.md` and `access-model.md`, and logs architecture decisions to `chronicle/memory/decisions.md` with the rejected alternative.
