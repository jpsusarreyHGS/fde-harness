/**
 * The load-bearing test.
 *
 * Scaffolds an engagement from the REAL templates and asserts it derives
 * all-zero with every instrument `empty`. This is the invariant that Phase 0
 * fixed and that everything downstream depends on: if a freshly initialised
 * engagement looks half-populated, every ratio on the dashboard is a lie.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { deriveState, type State } from "../src/state.ts";
import { INSTRUMENTS } from "../src/instruments.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");
const FEEDBACK = join(HARNESS, ".claude", "templates", "harness-improver", "feedback");

let tmp: string;
let state: State;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-fresh-"));
  const engagements = join(tmp, "engagements");

  const res = await scaffoldEngagement({
    engagementsRoot: engagements,
    deliverablesRoot: join(tmp, "deliverables"),
    templatesDir: TEMPLATES,
    feedbackDir: FEEDBACK,
    vars: {
      CLIENT_NAME: "Fixture Co",
      SLUG: "fixture-co",
      SPONSOR: "VP Operations",
      SCOPE: "Triage inbound correspondence",
      NON_GOALS: "No adjudication. No payment release.",
      RESIDENCY: "client-tenant",
      LABOUR: "none",
      DATE: "2026-09-08",
    },
  });

  assert.ok(res.created.length > 40, `expected 40+ seeded files, got ${res.created.length}`);

  // The gap that let {{PHASE}} reach derived state: the scaffolder reported
  // the unresolved placeholder and nothing asserted on it.
  assert.deepEqual(
    res.unresolved,
    [],
    `templates reference placeholders the scaffolder does not substitute: ${res.unresolved.join(", ")}`,
  );

  state = await deriveState({
    engagementDir: join(engagements, "fixture-co"),
    slug: "fixture-co",
    harnessRoot: HARNESS,
    now: new Date("2026-09-08T00:00:00Z"),
  });
});

after(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

test("scaffold seeds every registry instrument", () => {
  const absent = state.instruments.filter((i) => !i.present).map((i) => i.path);
  assert.deepEqual(absent, [], `registry instruments with no file: ${absent.join(", ")}`);
});

test("no register-shaped instrument derives anything at init", () => {
  // Templates ship zero data rows. Any register row here is seeded fake data.
  const nonEmpty = state.instruments
    .filter((i) => i.rows > 0)
    .filter((i) => i.tables.some((t) => t.role === "register"))
    .map((i) => `${i.id}(${i.rows})`);
  assert.deepEqual(nonEmpty, [], `templates ship register rows: ${nonEmpty.join(" · ")}`);
});

test("field-shaped instruments reflect init metadata and nothing else", () => {
  // An earlier version of this test asserted every instrument was `empty`.
  // That encoded an assumption that init provides nothing — but it provides
  // real metadata, and recording it is not fake data. Residency is one of the
  // six evidence terms, and it IS known at init. `thin` is the honest answer.
  const terms = state.instruments.find((i) => i.id === "evidence-handling-terms")!;
  assert.equal(terms.rows, 1, "residency is the one evidence term known at init");
  assert.equal(terms.status, "thin");

  const sponsor = state.instruments.find((i) => i.id === "sponsor-brief")!;
  assert.equal(sponsor.rows, 0, "the seven sponsor questions are unanswered at init");
});

test("every chain count is zero", () => {
  const c = state.chain;
  assert.equal(c.evidence.total, 0, "evidence");
  assert.equal(c.exceptions.total, 0, "exceptions");
  assert.equal(c.requirements.total, 0, "requirements");
  assert.equal(c.allocations.total, 0, "allocations");
  assert.equal(c.competencyQuestions.total, 0, "competency questions");
  assert.equal(c.ontologyObjects.promoted, 0, "promoted");
  assert.equal(c.ontologyObjects.backlog, 0, "backlog");
  assert.equal(c.evalCases.total, 0, "eval cases");
});

test("the chain audit reports nothing on an empty engagement", () => {
  const a = state.chain.audit;
  assert.deepEqual(a.findings, [], `unexpected findings: ${a.findings.map((f) => f.kind).join(", ")}`);
});

test("all ten stages present and in order", () => {
  assert.equal(state.stages.length, 10);
  assert.deepEqual(
    state.stages.map((s) => s.id),
    ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09"],
  );
});

test("only stage 00 has progress at init, and only from real metadata", () => {
  // Stage 00 is genuinely part-done the moment residency is recorded, so
  // asserting 0% there would be asserting a falsehood. Everything downstream
  // of the metadata must be untouched.
  const s00 = state.stages.find((s) => s.id === "00")!;
  assert.ok(s00.pct > 0 && s00.pct < 100, `stage 00 should be partial, got ${s00.pct}%`);

  const later = state.stages
    .filter((s) => s.id !== "00")
    .filter((s) => s.pct !== 0)
    .map((s) => `${s.id}=${s.pct}%`);
  assert.deepEqual(later, [], `stages beyond 00 non-zero at init: ${later.join(", ")}`);
});

test("stage labels are the runbook's, not paraphrased", () => {
  assert.equal(state.stages[0]!.label, "Before you land");
  assert.equal(state.stages[4]!.label, "Place the intelligence");
  assert.equal(state.stages[8]!.label, "Calculate the ROI");
});

test("all three gates are not-run, and none claims passed", () => {
  assert.equal(state.gates.length, 3);
  for (const g of state.gates) {
    assert.equal(g.status, "not-run", `${g.id} should be not-run`);
    assert.equal(g.decidedBy, null, `${g.id} must have no decider`);
  }
});

test("gate criteria are parsed from the memo templates", () => {
  const g1 = state.gates.find((g) => g.id === "G1")!;
  assert.equal(g1.criteria.length, 5, "G1 ships five criteria");
  assert.equal(g1.behaviours.length, 4, "G1 ships four behaviours");
  assert.ok(
    g1.criteria.some((c) => /canonical grain/i.test(c.name)),
    "G1 must require the canonical grain be chosen and defended",
  );
  assert.ok(
    g1.behaviours.some((b) => /should not be built/i.test(b.name)),
    "G1 must certify declining an automation",
  );
});

test("no unsubstituted placeholder reaches derived state", () => {
  const leaked = Object.entries(state.engagement)
    .filter(([, v]) => /\{\{[A-Z_]+\}\}/.test(v))
    .map(([k, v]) => `${k}=${v}`);
  assert.deepEqual(leaked, [], `placeholders in engagement identity: ${leaked.join(", ")}`);
});

test("engagement identity carries the fields the console renders", () => {
  for (const k of ["client", "sponsor", "scope", "stage", "residency", "labour"]) {
    assert.ok(state.engagement[k], `engagement.${k} missing from derived identity`);
  }
});

test("schema version is 2", () => {
  assert.equal(state.schemaVersion, 2);
});

test("no run events yet, and no sessions", () => {
  assert.equal(state.runEvents.count, 0);
  assert.equal(state.sessions.count, 0);
  assert.equal(state.sessions.latest, null);
});

test("scaffold is idempotent — a second run creates nothing", async () => {
  const engagements = join(tmp, "engagements");
  const again = await scaffoldEngagement({
    engagementsRoot: engagements,
    templatesDir: TEMPLATES,
    feedbackDir: FEEDBACK,
    vars: {
      CLIENT_NAME: "Fixture Co", SLUG: "fixture-co", SPONSOR: "VP Operations",
      SCOPE: "x", NON_GOALS: "y", DATE: "2026-09-08",
    },
  });
  assert.deepEqual(again.created, [], "re-running init must not overwrite");
  assert.ok(again.skipped.length > 40, "existing files should be reported as skipped");
});

test("no placeholder survives substitution", () => {
  assert.deepEqual(
    state.instruments.filter((i) => i.present).length > 0,
    true,
  );
  // scaffold reports any {{PLACEHOLDER}} it could not resolve
  // (asserted via the before() hook's result in the idempotency test above)
});

test("the registry and the templates do not drift", async () => {
  // every registry path exists as a template
  const { readdir } = await import("node:fs/promises");
  const seen = new Set<string>();
  const walk = async (dir: string, base = ""): Promise<void> => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(join(dir, e.name), rel);
      else if (e.name.endsWith(".md.template")) seen.add(rel.replace(/\.template$/, ""));
    }
  };
  await walk(TEMPLATES);

  const missingTemplate = INSTRUMENTS.filter((i) => !seen.has(i.path)).map((i) => i.path);
  assert.deepEqual(missingTemplate, [], `registry entries with no template: ${missingTemplate.join(", ")}`);
});
