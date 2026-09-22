/**
 * Phase 5: the coach.
 *
 * The thing under test is not "does it produce questions" — anything can do
 * that. It is whether the *order* is defensible, because a queue nobody trusts
 * is one nobody opens twice. So these tests hold the ranking to its stated
 * rules, and pin the three behaviours that made the first version unusable:
 * eight identical orphan complaints, five unowned gate criteria presented as a
 * conversation, and desk work sitting in a list of people to talk to.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseAnchoredTables } from "../src/anchors.ts";
import { coach, deskWork, nextConversations } from "../src/coach.ts";
import type { AuditFinding } from "../src/chain.ts";
import type { Gate } from "../src/state.ts";

const TABLES = parseAnchoredTables(`
<!-- table:stakeholder-map.five-roles role=labels key=Role answer=Name -->

| Role | Name |
|---|---|
| **The executive sponsor** | Priya Raman |
| **The exception holder** |  |
| **The operator** | Ana Fuentes |

<!-- table:prioritisation.rows role=register id=Rank -->

| Rank | Workflow |
|---|---|
| 1 | Claims triage |
| 2 | Vendor routing |
| 3 | Reporting |

<!-- table:open-questions.rows role=register id=Id -->

| Id | Question | Why it matters | Who can answer | Blocks | Raised | Answered | Answer |
|---|---|---|---|---|---|---|---|
| Q-001 | Which SLA governs a re-open? | Drives EX-009 handling | **The process owner** | Claims triage | 2026-09-01 |  |  |
| Q-002 | Who signs off fleet? | Blocks nothing yet | The operator | Reporting | 2026-08-01 |  |  |
`);

function finding(kind: AuditFinding["kind"], id: string): AuditFinding {
  return { kind, id, location: `02-Workflow/${kind}.md`, detail: `${id} detail.` };
}

const NO_GATES: Gate[] = [];

test("a question blocking the #1 workflow outranks an older one blocking the #3", () => {
  const qs = coach({ findings: [], gates: NO_GATES, tables: TABLES });
  const claims = qs.find((q) => q.key === "open-question:Q-001")!;
  const reporting = qs.find((q) => q.key === "open-question:Q-002")!;
  assert.ok(claims, "Q-001 missing");
  assert.ok(reporting, "Q-002 missing");
  // Q-002 is a month older. Age is not importance.
  assert.ok(
    claims.score > reporting.score,
    `expected Q-001 (${claims.score}) above Q-002 (${reporting.score})`,
  );
  assert.match(claims.why, /#1 workflow/);
});

test("the ranking explains itself, always", () => {
  const qs = coach({
    findings: [finding("exception-without-rule-holder", "EX-100")],
    gates: NO_GATES,
    tables: TABLES,
  });
  for (const q of qs) {
    assert.ok(q.why.length > 0, `${q.key} ranks with no stated reason`);
  }
  // And it says so plainly when the join found nothing, rather than implying
  // a considered order that does not exist.
  const ex = qs.find((q) => q.id === "EX-100")!;
  assert.match(ex.why, /nothing in prioritisation names what it blocks/);
});

test("roles lose their markdown and their doubled article", () => {
  const qs = coach({ findings: [], gates: NO_GATES, tables: TABLES });
  const unnamed = qs.find((q) => q.source === "stakeholder")!;
  assert.equal(unnamed.ask, "Who is the exception holder? A name, not a team.");
  // Priya is named, so she is not asked about — but she is resolved as the
  // person behind the sponsor role.
  assert.ok(!qs.some((q) => q.key.includes("executive sponsor")));
  const q1 = qs.find((q) => q.key === "open-question:Q-001")!;
  assert.equal(q1.who, "Process owner");
});

test("eight orphan findings are one conversation, not eight", () => {
  const orphans = Array.from({ length: 8 }, (_, i) =>
    finding("orphan-evidence", `EV-${String(i + 4).padStart(3, "0")}`),
  );
  const qs = coach({ findings: orphans, gates: NO_GATES, tables: TABLES });
  const merged = qs.filter((q) => q.key.startsWith("orphan-evidence"));
  assert.equal(merged.length, 1);
  assert.match(merged[0]!.ask, /8 observations nothing was built on/);
  assert.match(merged[0]!.ask, /EV-004, EV-005, EV-006, EV-007, …/);
});

test("desk work stays out of the list of people to talk to", () => {
  const qs = coach({
    findings: [finding("dangling-citation", "REQ-003")],
    gates: NO_GATES,
    tables: TABLES,
  });
  const dangling = qs.find((q) => q.id === "REQ-003")!;
  assert.equal(dangling.work, "fix");
  assert.deepEqual(deskWork(qs).map((q) => q.id), ["REQ-003"]);
  const groups = nextConversations(qs, 10);
  assert.ok(
    !groups.some((g) => g.questions.some((q) => q.id === "REQ-003")),
    "a dangling citation is nobody at the client's to answer",
  );
});

test("a finding the FDE already raised as a Q- is not asked twice", () => {
  // Q-001's "Why it matters" mentions EX-009.
  const qs = coach({
    findings: [
      finding("exception-without-rule-holder", "EX-009"),
      finding("exception-without-rule-holder", "EX-010"),
    ],
    gates: NO_GATES,
    tables: TABLES,
  });
  assert.ok(!qs.some((q) => q.id === "EX-009"), "EX-009 is already Q-001");
  assert.ok(qs.some((q) => q.id === "EX-010"), "EX-010 was never raised");
  // But a desk repair on the same id still stands — asking does not fix it.
  const withFix = coach({
    findings: [finding("dangling-citation", "EX-009")],
    gates: NO_GATES,
    tables: TABLES,
  });
  assert.ok(withFix.some((q) => q.id === "EX-009" && q.work === "fix"));
});

test("only the gate being worked toward contributes questions", () => {
  const gates: Gate[] = [
    {
      id: "G1", label: "Discovery gate", between: "03→04", status: "not-ready",
      date: null, decidedBy: null,
      criteria: [
        { name: "Operating map at standard", status: "unmet", evidence: "", toClose: "Fill the nine elements", owner: "**The process owner**" },
      ],
      behaviours: [], antiPatterns: [],
    },
    {
      id: "G2", label: "Build gate", between: "06→07", status: "not-run",
      date: null, decidedBy: null,
      criteria: [
        { name: "Evals pass", status: "unmet", evidence: "", toClose: "", owner: "" },
      ],
      behaviours: [], antiPatterns: [],
    },
  ];
  const qs = coach({ findings: [], gates, tables: TABLES });
  assert.ok(qs.some((q) => q.key.startsWith("G1:")));
  assert.ok(!qs.some((q) => q.key.startsWith("G2:")), "G2 should not crowd a stage-03 engagement");
  const g1 = qs.find((q) => q.key.startsWith("G1:"))!;
  assert.equal(g1.who, "Process owner");
  // Gate criteria outrank everything else — they are the client's own
  // definition of ready.
  assert.equal(qs[0]!.key, g1.key);
});

test("several unowned criteria collapse into one question about ownership", () => {
  const gates: Gate[] = [
    {
      id: "G1", label: "Discovery gate", between: "03→04", status: "not-ready",
      date: null, decidedBy: null,
      criteria: [
        { name: "A", status: "unmet", evidence: "", toClose: "", owner: "" },
        { name: "B", status: "unmet", evidence: "", toClose: "", owner: "" },
        { name: "C", status: "unmet", evidence: "", toClose: "", owner: "Ana" },
      ],
      behaviours: [], antiPatterns: [],
    },
  ];
  const qs = coach({ findings: [], gates, tables: TABLES });
  const gateQs = qs.filter((q) => q.source === "gate");
  assert.equal(gateQs.length, 2, "two unowned collapse to one, plus the owned one");
  const collapsed = gateQs.find((q) => q.key === "G1:unowned")!;
  assert.match(collapsed.ask, /2 of G1's criteria have no owner: A; B\. Who owns each\?/);
  assert.equal(collapsed.whoName, "Priya Raman");
});

test("the order is stable across runs on unchanged files", () => {
  const input = {
    findings: [finding("unsourced-requirement", "REQ-1"), finding("unsourced-requirement", "REQ-2")],
    gates: NO_GATES,
    tables: TABLES,
  };
  assert.deepEqual(coach(input).map((q) => q.key), coach(input).map((q) => q.key));
});

test("every location the coach prints is a real path", async () => {
  // A queue that sends the operator to a file that does not exist teaches them
  // to stop reading the path. This shipped once: `gate-g1.md` for a memo that
  // lives at `stage-gate-1-readiness.md`.
  const { readdir } = await import("node:fs/promises");
  const { join, resolve, sep } = await import("node:path");
  const templates = resolve(import.meta.dirname, "..", "..", "..", ".claude", "templates", "engagement-init");

  const known = new Set<string>();
  const walk = async (dir: string) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith(".template")) {
        known.add(full.slice(templates.length + 1).split(sep).join("/").replace(/\.template$/, ""));
      }
    }
  };
  await walk(templates);

  const gates: Gate[] = (["G1", "G2", "G3"] as const).map((id) => ({
    id, label: id, between: "x→y", status: "not-ready" as const,
    date: null, decidedBy: null,
    criteria: [{ name: "c", status: "unmet", evidence: "", toClose: "", owner: "Ana" }],
    behaviours: [], antiPatterns: [],
  }));

  const kinds: AuditFinding["kind"][] = [
    "unsourced-requirement", "orphan-evidence", "dangling-citation",
    "unverified-in-placement", "gap-without-question", "unowned-assumption",
    "allocation-without-reason", "exception-without-rule-holder",
  ];

  for (const g of gates) {
    for (const q of coach({ findings: kinds.map((k) => finding(k, "X-001")), gates: [g], tables: TABLES })) {
      // Chain findings carry the audit's own location, which is exercised by
      // the seeded fixtures; this test owns the ones the coach composes.
      if (q.source === "chain") continue;
      assert.ok(known.has(q.location), `${q.key} points at ${q.location}, which no template creates`);
    }
  }
});

// ---------------------------------------------------------- item 3: four lines

test("every question carries all four lines: ask, why, means, goes", async () => {
  // Every source the coach composes from, in one run.
  const gates: Gate[] = [{
    id: "G1", label: "Discovery gate", between: "03→04", status: "not-ready",
    date: null, decidedBy: null,
    criteria: [
      { name: "A", status: "unmet", evidence: "", toClose: "", owner: "" },
      { name: "B", status: "unmet", evidence: "", toClose: "", owner: "" },
      { name: "Readiness scorecard — the data landmines found", status: "unmet", evidence: "", toClose: "Score SAP", owner: "Ana" },
    ],
    behaviours: [], antiPatterns: [],
  }];
  const kinds: AuditFinding["kind"][] = [
    "unsourced-requirement", "orphan-evidence", "dangling-citation",
    "unverified-in-placement", "gap-without-question", "unowned-assumption",
    "allocation-without-reason", "exception-without-rule-holder", "hypothesis-never-revisited",
  ];
  const qs = coach({
    findings: [...kinds.map((k) => finding(k, "X-001")), finding("orphan-evidence", "X-002")],
    gates,
    tables: TABLES,
    contract: [{ code: "term-without-owner", severity: "refuse", where: "glossary.md", detail: "Term 'claim' has no owner", who: "Process owner", location: "03-Systems/ontology/glossary.md" }],
  });
  const sources = new Set(qs.map((q) => q.source));
  for (const s of ["gate", "chain", "open-question", "stakeholder", "contract"]) {
    assert.ok(sources.has(s as never), `no ${s} question in the run — the test lost coverage`);
  }
  for (const q of qs) {
    assert.ok(q.ask.length > 0, `${q.key}: no ask`);
    assert.ok(q.why.length > 0, `${q.key}: no why`);
    assert.ok(q.means.length > 20, `${q.key}: means is missing or a stub`);
    assert.ok(q.goes.length > 0, `${q.key}: no goes`);
    assert.notEqual(q.means, q.why, `${q.key}: means must explain the question, not repeat the ranking`);
  }
  // `goes` names a column, not just a file.
  const ex = qs.find((q) => q.id === "X-001" && q.key.startsWith("exception-without"))!;
  assert.match(ex.goes, /Rule holder \(role\) column/);
  assert.match(ex.means, /golden set/);
});

test("a question /init-engagement raised for a TBD is a setup question, and says how to fix it", () => {
  const tables = parseAnchoredTables(`
<!-- table:open-questions.rows role=register id=Id -->

| Id | Question | Why it matters | Who can answer | Blocks | Raised | Answered | Answer |
|---|---|---|---|---|---|---|---|
| Q-001 | Which repository holds the ontology for this client? | ONTOLOGY_REPO was left unresolved at init. | Technical owner | 03-Systems/ontology/ promotion | 2026-09-15 |  |  |
| Q-002 | Which platform does the assistant compile to — jena, databricks or fabric? | TARGET_PLATFORM was left unresolved at init. | Technical owner | the ontology compile | 2026-09-15 |  |  |
| Q-003 | Where does captured evidence live — client tenant or HGS tenant? | RESIDENCY was left unresolved at init. | Security owner | all capture | 2026-09-15 |  |  |
| Q-004 | Is the 60-line SAP export a full snapshot or a sample? | Every count derived from it is a sample count if so. | Systems gatekeeper | value hypothesis | 2026-09-15 |  |  |
`);
  const qs = coach({ findings: [], gates: NO_GATES, tables });
  const byId = Object.fromEntries(qs.map((q) => [q.id, q]));

  // The two the trainee could not parse, reworded — technical term kept once, in parentheses.
  assert.equal(byId["Q-001"]!.ask, "Q-001: Where will the client's approved vocabulary and data model be published (the ontology repo)?");
  assert.equal(byId["Q-002"]!.ask, "Q-002: Which platform will the built solution run on (the compile target: jena, databricks or fabric)?");
  assert.ok(!/compile to|repo holds/.test(byId["Q-002"]!.ask + byId["Q-001"]!.ask));

  // Every init-raised question names the fix and where it lands.
  for (const id of ["Q-001", "Q-002", "Q-003"]) {
    assert.match(byId[id]!.goes, /re-run \/init-engagement or edit the file directly/, `${id} goes`);
    assert.match(byId[id]!.goes, /^00-Setup\//, `${id} lands in setup, not in an ontology folder`);
    assert.match(byId[id]!.means, /Left as TBD at \/init-engagement\.$/, `${id} means`);
  }
  assert.match(byId["Q-002"]!.means, /does not block G1/);
  assert.match(byId["Q-003"]!.means, /Capture cannot start/);

  // An ordinary question keeps its wording and inherits its own "why it matters".
  assert.equal(byId["Q-004"]!.ask, "Q-004: Is the 60-line SAP export a full snapshot or a sample?");
  assert.match(byId["Q-004"]!.means, /^Every count derived from it is a sample count if so\./);
  assert.match(byId["Q-004"]!.goes, /open-questions\.md — Answer and Answered columns for Q-004/);
});

test("a freshly scaffolded caldera raises setup questions the coach explains", async () => {
  const { mkdtemp, rm, readFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { initEngagement, validateVars } = await import("../src/init.ts");
  const { deriveState } = await import("../src/state.ts");
  const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
  const tmp = await mkdtemp(join(tmpdir(), "fde-caldera-"));
  try {
    const vars = validateVars(
      JSON.parse(await readFile(join(HARNESS, "examples", "caldera-logistics", "vars.json"), "utf8")),
      "caldera-logistics",
    );
    const dir = join(tmp, "engagements", "caldera-logistics");
    await initEngagement({ engagementDir: dir, harnessRoot: HARNESS, vars, deliverablesRoot: join(tmp, "deliverables") });
    const state = await deriveState({ engagementDir: dir, slug: "caldera-logistics", harnessRoot: HARNESS });
    const setup = state.coach.filter((q) => /re-run \/init-engagement/.test(q.goes));
    // Caldera leaves SYSTEMS, ONTOLOGY_REPO and RESIDENCY as TBD and omits
    // SCOPE_SOURCE. TARGET_PLATFORM is "undecided", which is an answer — the
    // stack decision says so — and raises nothing.
    assert.ok(setup.length >= 4, `expected the four TBDs as setup questions; got ${setup.length}`);
    assert.ok(!setup.some((q) => /platform/.test(q.ask)), "undecided is not TBD");
    for (const q of state.coach) {
      assert.ok(q.means && q.goes, `${q.key} missing means/goes in derived state`);
    }
    // The new wording is what a new engagement writes into the register.
    const oq = await readFile(join(dir, "02-Workflow", "open-questions.md"), "utf8");
    assert.match(oq, /Where will the client's approved vocabulary and data model be published/);
    assert.ok(!/Which repository holds the ontology/.test(oq), "old wording gone");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("a gate memo nobody has run contributes no criterion questions — only the sponsor behaviour", () => {
  const notRun: Gate = {
    id: "G1", label: "Discovery gate", between: "03→04", status: "not-run",
    date: null, decidedBy: null,
    criteria: [
      { name: "A", status: "unmet", evidence: "", toClose: "", owner: "" },
      { name: "B", status: "unmet", evidence: "", toClose: "", owner: "" },
      { name: "Readiness scorecard — the data landmines found", status: "unmet", evidence: "", toClose: "", owner: "" },
    ],
    behaviours: [{ name: "Can state the sponsor's real problem in one sentence that is not what they asked for", observed: false, where: "" }],
    antiPatterns: [],
  };
  const qs = coach({ findings: [], gates: [notRun], tables: TABLES });
  const gate = qs.filter((q) => q.source === "gate");
  assert.equal(gate.length, 1, "only the behaviour");
  assert.match(gate[0]!.key, /^G1:behaviour/);
  assert.ok(!qs.some((q) => /criteria have no owner/.test(q.ask)), "nobody is asked who owns an unwritten memo");
  // Once the memo has been assessed, the criteria are questions as before.
  const assessed = coach({ findings: [], gates: [{ ...notRun, status: "not-ready" }], tables: TABLES });
  assert.ok(assessed.some((q) => /criteria have no owner/.test(q.ask)));
});

test("an unnamed-role question is addressed to the sponsor by name when the map has one", () => {
  const q = coach({ findings: [], gates: NO_GATES, tables: TABLES }).find((x) => x.source === "stakeholder")!;
  assert.equal(q.who, "Executive sponsor");
  assert.equal(q.whoName, "Priya Raman");
});
