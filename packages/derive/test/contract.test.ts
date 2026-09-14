/**
 * The contract layer, checked before it leaves the harness.
 *
 * These are the ontology compiler's own refusals, run here. The test that
 * matters is not "does it find a gap" but "does it find the same gaps, and
 * keep the same distinction" — the compiler treats thinness as a warning and
 * a missing owner as a refusal, and a harness that disagreed would either wave
 * through a build that fails downstream or block one that would have worked.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseAnchoredTables } from "../src/anchors.ts";
import {
  checkContract, CONTRACT_INSTRUMENTS, REQUIRED_TABLES, type ContractFinding,
} from "../src/contract.ts";
import type { IdPrefix } from "../src/ids.ts";

const FILES = new Set(CONTRACT_INSTRUMENTS.map((i) => i.file));

function known(ids: string[]): Map<IdPrefix, Set<string>> {
  const m = new Map<IdPrefix, Set<string>>();
  for (const id of ids) {
    const p = id.split("-")[0] as IdPrefix;
    if (!m.has(p)) m.set(p, new Set());
    m.get(p)!.add(id);
  }
  return m;
}

/** A contract with nothing wrong in it. */
const GOOD = `
<!-- table:glossary.terms role=register id=Term -->

| Term | Definition | **Grain — one row is one what?** | Synonyms | Used by | Owner | Worked example | Source |
|---|---|---|---|---|---|---|---|
| Job | A dispatched unit of field work. | one visit to one site | Ticket | Dispatcher | Priti (Dispatcher) | J-5001 at Harbour Depot | EV-001 |

<!-- table:personas.permissions role=register id=Role -->

| Role | Read | Create | Modify | Approve | Close |
|---|---|---|---|---|---|
| DISPATCHER | yes | yes | yes | yes | no |

<!-- table:personas.write-allow-list role=register id=Id -->

| Id | Write | Object | Roles permitted | Approver | Reversible | Use case |
|---|---|---|---|---|---|---|
| WR-01 | Job note | fs:JobNote | DISPATCHER | DISPATCHER | No | UC-01 |

<!-- table:competency-questions.rows role=register id=Id -->

| Id | Question | Asked by | Evidence they ask it | Entities needed | Status | Template | Gap type |
|---|---|---|---|---|---|---|---|
| CQ-01 | Which jobs are open? | DISPATCHER | EV-001 | Job | answerable | cq-01-open-jobs | — |

<!-- table:source-systems.identity-rules role=register id=Entity -->

| Entity | Minted by | Referenced by | Key | Stable? | On disagreement |
|---|---|---|---|---|---|
| Job | D1 | — | job_id | Yes | D1 is sole author. |

<!-- table:source-systems.field-mappings role=register id=Source -->

| Source | Field | Type | Maps to object | Maps to property | Transform | Nullable | Notes |
|---|---|---|---|---|---|---|---|
| D1 | jobs.job_id | string | Job | jobId | none | No | Identity key |
`;

function run(md: string, ids = ["EV-001"]): ContractFinding[] {
  return checkContract({
    tables: parseAnchoredTables(md),
    present: FILES,
    known: known(ids),
  });
}

const codes = (f: ContractFinding[]) => f.map((x) => x.code);
const refusals = (f: ContractFinding[]) => f.filter((x) => x.severity === "refuse");

test("a complete contract produces nothing at all", () => {
  assert.deepEqual(run(GOOD), []);
});

test("the four refusals the compiler will not build past", () => {
  // One case per refusal, each removing exactly one cell from GOOD.
  const cases: [string, string, string][] = [
    ["| Priti (Dispatcher) | J-5001 at Harbour Depot |", "|  | J-5001 at Harbour Depot |", "term-no-owner"],
    ["| DISPATCHER | EV-001 |", "|  | EV-001 |", "cq-no-persona"],
    ["| DISPATCHER | DISPATCHER | No |", "| DISPATCHER |  | No |", "write-no-approver"],
    ["| Job | D1 | — | job_id |", "| Job |  | — | job_id |", "identity-no-minting-system"],
  ];
  for (const [from, to, code] of cases) {
    assert.ok(GOOD.includes(from), `fixture drifted: ${from}`);
    const found = run(GOOD.replace(from, to));
    assert.ok(
      refusals(found).some((f) => f.code === code),
      `expected ${code}, got ${codes(found).join(", ") || "nothing"}`,
    );
  }
});

test("a grain missing from a term is a refusal, and says what a grain is", () => {
  const f = run(GOOD.replace("| one visit to one site |", "|  |"));
  const grain = refusals(f).find((x) => x.code === "term-no-grain")!;
  assert.ok(grain, "expected term-no-grain");
  assert.match(grain.detail, /One row is one what\?/);
  assert.equal(grain.who, "Process owner");
});

test("thinness is a warning, never a refusal", () => {
  // A CQ with no template yet and a term with no worked example are both
  // progress you can see. Blocking on them would teach people to fill cells
  // with anything.
  const thin = GOOD
    .replace("| answerable | cq-01-open-jobs |", "| answerable |  |")
    .replace("| J-5001 at Harbour Depot |", "|  |");
  const f = run(thin);
  assert.deepEqual(refusals(f), [], "nothing here blocks a build");
  assert.deepEqual(codes(f).sort(), ["cq-no-template", "term-no-example"]);
});

test("a dangling id is caught here, because downstream it becomes a filename", () => {
  const f = run(GOOD.replace("| EV-001 | Job |", "| EV-999 | Job |"));
  const d = refusals(f).find((x) => x.code === "dangling-citation")!;
  assert.ok(d, `expected dangling-citation, got ${codes(f).join(", ")}`);
  assert.match(d.detail, /EV-999/);
  assert.match(d.where, /competency-questions\.rows/);
});

test("a CQ id that is not CQ-NN is refused — ids are the join key", () => {
  const f = run(GOOD.replace("| CQ-01 | Which jobs", "| CQ1 | Which jobs"));
  assert.ok(refusals(f).some((x) => x.code === "cq-bad-id"));
});

test("a missing required anchor is refused, and says renaming is deliberate", () => {
  const f = run(GOOD.replace("<!-- table:personas.permissions role=register id=Role -->", ""));
  const t = refusals(f).find((x) => x.code === "table-missing")!;
  assert.ok(t);
  assert.match(t.detail, /Anchors are the schema/);
  // And the permission matrix being gone is itself the role-vocabulary refusal.
  assert.ok(refusals(f).some((x) => x.code === "no-permission-matrix"));
});

test("required and optional instruments are reported differently", () => {
  const partial = new Set(["03-Systems/ontology/glossary.md"]);
  const f = checkContract({
    tables: parseAnchoredTables(GOOD),
    present: partial,
    known: known(["EV-001"]),
  });
  const missing = f.filter((x) => x.code === "instrument-missing").map((x) => x.where);
  const absent = f.filter((x) => x.code === "instrument-absent").map((x) => x.where);
  assert.deepEqual(missing.sort(), [
    "03-Systems/ontology/competency-questions.md",
    "03-Systems/ontology/personas.md",
    "03-Systems/ontology/source-systems.md",
  ]);
  // spec.md lives in stage 05 and the compiler accepts it from there.
  assert.ok(absent.includes("05-Build/spec.md"));
  assert.ok(absent.every((w) => !w.includes("glossary")));
});

test("the blank set matches the compiler's, which is wider than ours", () => {
  // The compiler counts n/a, tbc and ? as absent. A cell that passes here and
  // fails there reads as the harness having approved it.
  for (const v of ["n/a", "TBC", "?", "—", "-", "tbd", " "]) {
    const f = run(GOOD.replace("| Priti (Dispatcher) |", `| ${v} |`));
    assert.ok(
      refusals(f).some((x) => x.code === "term-no-owner"),
      `${JSON.stringify(v)} should count as no owner`,
    );
  }
});

test("the required tables are the six the compiler aborts without", () => {
  assert.deepEqual([...REQUIRED_TABLES], [
    "glossary.terms",
    "personas.permissions",
    "personas.write-allow-list",
    "competency-questions.rows",
    "source-systems.identity-rules",
    "source-systems.field-mappings",
  ]);
});

test("a refusal becomes a question with a name, not an error code", async () => {
  const { coach } = await import("../src/coach.ts");
  const stakeholders = parseAnchoredTables(`
<!-- table:stakeholder-map.five-roles role=labels key=Role answer=Name -->

| Role | Name |
|---|---|
| **The process owner** | Priti Raman |
`);
  const contract = run(GOOD.replace("| Priti (Dispatcher) |", "|  |"));
  const qs = coach({ findings: [], gates: [], tables: stakeholders, contract });

  const q = qs.find((x) => x.source === "contract")!;
  assert.ok(q, "a refusal should reach the queue");
  assert.equal(q.who, "Process owner");
  assert.equal(q.whoName, "Priti Raman", "the role resolves to a person");
  assert.equal(q.work, "ask");
  assert.equal(q.blocks, "the ontology compile");
  assert.match(q.why, /refuses on term no owner/);
  // Above every chain finding: a refusal is a build that will not happen.
  assert.ok(q.score > 40);
});

test("a refusal nobody at the client can answer is desk work", async () => {
  const { coach, deskWork } = await import("../src/coach.ts");
  const contract = run(GOOD.replace("| EV-001 | Job |", "| EV-999 | Job |"));
  const qs = coach({ findings: [], gates: [], tables: [], contract });
  assert.ok(deskWork(qs).some((q) => q.source === "contract"));
});

test("warnings never reach the queue", async () => {
  const { coach } = await import("../src/coach.ts");
  const contract = run(GOOD.replace("| answerable | cq-01-open-jobs |", "| answerable |  |"));
  assert.ok(contract.every((f) => f.severity === "warn"));
  assert.deepEqual(
    coach({ findings: [], gates: [], tables: [], contract }).filter((q) => q.source === "contract"),
    [],
  );
});
