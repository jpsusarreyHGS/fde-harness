/**
 * A seeded engagement, with deliberate defects.
 *
 * Proves the chain audit catches what markdown cannot: a citation pointing at
 * an id that does not exist, a requirement with no source, evidence captured
 * and never used, an allocation with no reason, and an exception with no rule
 * holder. Each of these is a real failure mode from the runbook, and each is
 * invisible to a reviewer scanning a table by eye.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { deriveState, type State } from "../src/state.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");

let tmp: string;
let dir: string;
let state: State;

/** Append rows under an anchored table, the way an FDE editing the file would. */
async function appendRows(file: string, anchor: string, rows: string[]) {
  const p = join(dir, ...file.split("/"));
  const md = await readFile(p, "utf8");
  const lines = md.split(/\r?\n/);
  const ai = lines.findIndex((l) => l.includes(`table:${anchor} `));
  assert.ok(ai >= 0, `anchor ${anchor} not found in ${file}`);
  // header + separator follow the anchor (after a blank line)
  let i = ai;
  while (i < lines.length && !lines[i]!.trim().startsWith("|")) i++;
  const insertAt = i + 2; // past header and separator
  lines.splice(insertAt, 0, ...rows);
  await writeFile(p, lines.join("\n"), "utf8");
}

async function setKv(file: string, key: string, value: string) {
  const p = join(dir, ...file.split("/"));
  const md = await readFile(p, "utf8");
  const re = new RegExp(`^\\|\\s*${key}\\s*\\|[^|]*\\|$`, "m");
  assert.ok(re.test(md), `kv row "${key}" not found in ${file}`);
  await writeFile(p, md.replace(re, `| ${key} | ${value} |`), "utf8");
}

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-seeded-"));
  const engagements = join(tmp, "engagements");
  await scaffoldEngagement({
    engagementsRoot: engagements,
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Seeded Co", SLUG: "seeded-co", SPONSOR: "Director, Ops",
      SCOPE: "Correspondence triage", NON_GOALS: "No adjudication.",
      RESIDENCY: "client-tenant", LABOUR: "works-council", DATE: "2026-09-08",
    },
  });
  dir = join(engagements, "seeded-co");

  // 4 observations. EV-004 is deliberately cited by nothing -> orphan.
  await appendRows("02-Workflow/observation-log.md", "observation-log.rows", [
    "| EV-001 | 09:02:11 | Analyst | opened correspondence | Mailbox | 14 | — | switch | observed | |",
    "| EV-002 | 09:02:25 | Analyst | pasted ref into core | Core | 38 | — | paste | observed | \"always retype it\" |",
    "| EV-003 | 09:03:03 | Analyst | waited on approval | — | 900 | approver away | dead | observed | |",
    "| EV-004 | 09:20:00 | Supervisor | reran nightly report | BI | 60 | — | repeat | system | nobody opens it |",
  ]);

  // 2 exceptions. EX-002 has no rule holder -> finding.
  await appendRows("02-Workflow/exception-register.md", "exception-register.rows", [
    "| EX-001 | payment after close | 12 per week | routed to recon queue | Claims supervisor | \"if it lands after close, recon takes it\" | EV-001 | |",
    "| EX-002 | vendor mismatch | unquantified | analyst decides | | | EV-002 | |",
  ]);

  // 3 requirements: one good, one unsourced, one citing a nonexistent id.
  await appendRows("02-Workflow/requirements-register.md", "requirements-register.rows", [
    "| REQ-001 | Route post-close payments to recon | EX-001 | functional | verified | Given a payment after close, when triaged, then it routes to recon | must | Process owner |",
    "| REQ-002 | Summarise vendor mismatches | | functional | UNVERIFIED | Given a mismatch, then a summary is produced | should | Process owner |",
    "| REQ-003 | Suppress duplicate alerts | EV-099 | functional | verified | Given a duplicate, then only one alert fires | should | Tech owner |",
  ]);

  // 2 allocations. AL-002 has a token reason -> finding.
  await appendRows("04-Placement/allocation-grid.md", "allocation-grid.rows", [
    "| AL-001 | 1 | Open correspondence | deterministic | Structured mailbox routing on sender and subject; no judgement involved | low | no | Client IT | 1400/day | none |",
    "| AL-002 | 3 | Decide vendor route | model-judgement | ok | high | yes | FDE | 90/day | rework |",
  ]);

  // one operating-map step so stage 04 has a denominator
  await appendRows("02-Workflow/operating-map.md", "operating-map.steps", [
    "| 1 | Open correspondence | Analyst | Mailbox | 14 | yes | EV-001 | observed |",
    "| 2 | Match to member | Analyst | Core | 38 | yes | EV-002 | observed |",
    "| 3 | Decide vendor route | Analyst | Core | 25 | yes | EV-002 | observed |",
  ]);

  // a gate assessed but not decided -> ready, never passed
  await setKv("engagement-management/stage-gate-1-readiness.md", "Recommendation", "READY WITH CAVEATS");

  state = await deriveState({
    engagementDir: dir, slug: "seeded-co", harnessRoot: HARNESS,
    now: new Date("2026-09-08T00:00:00Z"),
  });
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

test("evidence counted and classified", () => {
  assert.equal(state.chain.evidence.total, 4);
  assert.equal(state.chain.evidence.observed, 3);
  assert.equal(state.chain.evidence.system, 1);
});

test("exceptions: rule holders and quantified frequency counted separately", () => {
  const e = state.chain.exceptions;
  assert.equal(e.total, 2);
  assert.equal(e.withRuleHolder, 1, "EX-002 has no rule holder");
  assert.equal(e.quantified, 1, "EX-002 is explicitly unquantified");
});

test("requirements: sourced, confidence and AC counted", () => {
  const r = state.chain.requirements;
  assert.equal(r.total, 3);
  assert.equal(r.sourced, 2, "REQ-002 has no Source");
  assert.equal(r.unverified, 1, "REQ-002 is UNVERIFIED");
  assert.equal(r.withAC, 3);
});

test("AUDIT: dangling citation detected with its location", () => {
  const f = state.chain.audit.findings.filter((x) => x.kind === "dangling-citation");
  assert.equal(f.length, 1);
  assert.equal(f[0]!.id, "REQ-003");
  assert.match(f[0]!.detail, /EV-099/);
  assert.equal(f[0]!.location, "02-Workflow/requirements-register.md");
  assert.equal(state.chain.audit.danglingCitations, 1);
});

test("AUDIT: unsourced requirement detected", () => {
  const f = state.chain.audit.findings.filter((x) => x.kind === "unsourced-requirement");
  assert.equal(f.length, 1);
  assert.equal(f[0]!.id, "REQ-002");
});

test("AUDIT: orphan evidence detected", () => {
  const f = state.chain.audit.findings.filter((x) => x.kind === "orphan-evidence");
  assert.deepEqual(f.map((x) => x.id), ["EV-003", "EV-004"]);
});

test("AUDIT: allocation with a token reason is rejected", () => {
  const f = state.chain.audit.findings.filter((x) => x.kind === "allocation-without-reason");
  assert.equal(f.length, 1, "'ok' is not a reason");
  assert.equal(f[0]!.id, "AL-002");
});

test("AUDIT: exception with no rule holder detected", () => {
  const f = state.chain.audit.findings.filter((x) => x.kind === "exception-without-rule-holder");
  assert.deepEqual(f.map((x) => x.id), ["EX-002"]);
});

test("AUDIT: unverified requirement flagged once placement has begun", () => {
  const f = state.chain.audit.findings.filter((x) => x.kind === "unverified-in-placement");
  assert.equal(f.length, 1, "REQ-002 is stated-only and allocation has started");
});

test("allocations counted by category, and by whether a reason survives", () => {
  const a = state.chain.allocations;
  assert.equal(a.total, 2);
  assert.equal(a.deterministic, 1);
  assert.equal(a.modelJudgement, 1);
  assert.equal(a.withReason, 1);
});

test("declining well is visible: leaveAlone is zero here, which is a signal", () => {
  assert.equal(state.chain.allocations.leaveAlone, 0);
});

test("stage 04 pct is allocations over operating-map steps", () => {
  const s4 = state.stages.find((s) => s.id === "04")!;
  assert.equal(s4.pct, 67, "2 of 3 steps allocated");
  assert.equal(s4.status, "active");
});

test("stage 02 is active once its instruments have rows", () => {
  const s2 = state.stages.find((s) => s.id === "02")!;
  assert.ok(s2.pct > 0 && s2.pct < 100, `expected partial coverage, got ${s2.pct}`);
});

test("GATE: assessed but undecided derives ready, never passed", () => {
  const g1 = state.gates.find((g) => g.id === "G1")!;
  assert.equal(g1.status, "caveats");
  assert.equal(g1.decidedBy, null, "no decider means no pass");
  assert.notEqual(g1.status, "passed");
});

test("instrument row counts come from the primary register table only", () => {
  const obs = state.instruments.find((i) => i.id === "observation-log")!;
  assert.equal(obs.rows, 4);
  assert.equal(obs.status, "thin", "4 rows is thin; 5+ is populated");
  // the instrument also holds a sessions register that must not inflate rows
  assert.ok(obs.tables.some((t) => t.name === "observation-log.sessions"));
});

test("labels tables never contribute rows", () => {
  const sm = state.instruments.find((i) => i.id === "stakeholder-map")!;
  const labels = sm.tables.filter((t) => t.role === "labels");
  assert.ok(labels.length > 0, "stakeholder-map ships the five roles as labels");
  // rows come from decision-rights (a register), which is still empty
  assert.equal(sm.rows, 0, "the five fixed role rows must not count as data");
});
