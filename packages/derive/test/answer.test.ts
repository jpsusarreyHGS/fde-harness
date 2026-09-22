/**
 * Item 2 of the SIM-01 brief: answers given in chat evaporated, and `/next`
 * asked for things the engagement already held.
 *
 * The `answer` verb writes a chat answer where intake already looks. The
 * coach's `verify` work-kind stops a gate criterion from being asked when the
 * instrument that would hold the answer is populated.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { recordAnswer } from "../src/answer.ts";
import { scanIntake } from "../src/intake.ts";
import { appendRows, fillCells, WriteRefused } from "../src/writer.ts";
import { mintIds } from "../src/ids.ts";
import { parseAnchoredTables } from "../src/anchors.ts";
import { coach, nextConversations, verifyFirst } from "../src/coach.ts";
import type { Gate } from "../src/state.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");

let tmp: string;
let dir: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-answer-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Solara Foods", SLUG: "solara-foods", SPONSOR: "Dana Whitfield, VP Finance",
      SCOPE: "Deductions", NON_GOALS: "No portal changes.",
      RESIDENCY: "client-tenant", LABOUR: "none", DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "solara-foods");
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

// ------------------------------------------------------------------- answer

test("an answer is written into evidence/stated, and intake sees it", async () => {
  const res = await recordAnswer(dir, {
    question: "What is Dana trying to accomplish?",
    answer: "I want to stop finding out about write-offs at quarter close.",
    from: "Dana Whitfield, VP Finance",
    now: new Date("2026-09-22T14:05:00Z"),
  });
  assert.equal(res.created, true);
  assert.equal(res.evidenceClass, "stated");
  assert.equal(res.path, "02-Workflow/evidence/stated/2026-09-22-answers.md");

  const md = await readFile(join(dir, ...res.path.split("/")), "utf8");
  assert.match(md, /^# Answers recorded — 2026-09-22/);
  assert.match(md, /Evidence class: \*\*stated\*\* — corroborating only/);
  assert.match(md, /## 14:05 — What is Dana trying to accomplish\?/);
  assert.match(md, /\*\*Answered by:\*\* Dana Whitfield, VP Finance/);
  assert.match(md, /> I want to stop finding out about write-offs at quarter close\./);

  const { items } = await scanIntake(dir);
  const seen = items.find((i) => i.file === "2026-09-22-answers.md");
  assert.ok(seen, "intake lists the answers file");
  assert.equal(seen.evidenceClass, "stated", "the folder decided");
});

test("a second answer the same day appends rather than overwrites", async () => {
  const res = await recordAnswer(dir, {
    question: "Who signs off a dispute above $10k when Dana is travelling?",
    answer: "It waits. Nobody else has the authority.",
    from: "Priya Shah, deductions manager",
    now: new Date("2026-09-22T15:40:00Z"),
  });
  assert.equal(res.created, false);
  const md = await readFile(join(dir, ...res.path.split("/")), "utf8");
  assert.match(md, /## 14:05 — What is Dana trying to accomplish\?/, "the first entry survived");
  assert.match(md, /## 15:40 — Who signs off a dispute above \$10k/);
  assert.equal((md.match(/^# Answers recorded/gm) ?? []).length, 1, "one header");
});

test("a Q- id is looked up and its wording carried; an unknown id is refused", async () => {
  const { ids } = await mintIds(dir, "Q", 1);
  await appendRows(dir, "02-Workflow/open-questions.md", "open-questions.rows", [{
    Id: ids[0]!, Question: "Is the 60-row SAP export a sample or the month?",
    "Why it matters": "Every count derived from it is a sample count if so",
    "Who can answer": "Systems gatekeeper", Blocks: "value-hypothesis", Raised: "2026-09-22",
  }]);
  const res = await recordAnswer(dir, {
    question: ids[0]!.toLowerCase(),
    answer: "A sample. Lena pulled sixty to show the shape.",
    from: "Lena Ortiz, IT business analyst",
    now: new Date("2026-09-22T16:00:00Z"),
  });
  assert.equal(res.questionId, ids[0]);
  const md = await readFile(join(dir, ...res.path.split("/")), "utf8");
  assert.match(md, new RegExp(`## 16:00 — ${ids[0]}\\n\\n\\*\\*Asked:\\*\\* Is the 60-row SAP export a sample or the month\\?`));

  await assert.rejects(
    () => recordAnswer(dir, { question: "Q-999", answer: "x", from: "y" }),
    (e: Error) => e instanceof WriteRefused && /Q-999 is not in open-questions\.md/.test(e.message),
  );
});

test("an answer with nobody behind it is refused", async () => {
  await assert.rejects(
    () => recordAnswer(dir, { question: "q", answer: "a", from: "  " }),
    (e: Error) => e instanceof WriteRefused && /--from/.test(e.message),
  );
});

test("documented is allowed; the file goes in that folder", async () => {
  const res = await recordAnswer(dir, {
    question: "What does the policy say about write-off thresholds?",
    answer: "Under $200 auto write-off, per finance policy FP-14 §3.",
    from: "Finance policy FP-14, quoted by Priya Shah",
    evidenceClass: "documented",
    now: new Date("2026-09-22T16:10:00Z"),
  });
  assert.equal(res.path, "02-Workflow/evidence/documented/2026-09-22-answers.md");
});

// ------------------------------------------------------------------- verify

const G1: Gate = {
  id: "G1", label: "Discovery", between: "03→04", status: "not-ready",
  date: null, decidedBy: null,
  criteria: [
    { name: "Can state the sponsor's real problem in one sentence that is not what they asked for", status: "unmet", evidence: "", toClose: "Say it", owner: "**The executive sponsor**" },
    { name: "Stakeholder map — five roles identified correctly, decision rights defensible", status: "unmet", evidence: "", toClose: "", owner: "The process owner" },
    { name: "Readiness scorecard — the data landmines found", status: "unmet", evidence: "", toClose: "", owner: "The systems gatekeeper" },
    { name: "Evidence-handling terms signed; monitoring constraint checked", status: "unmet", evidence: "", toClose: "Get the signature", owner: "The executive sponsor" },
  ],
  behaviours: [], antiPatterns: [],
};

async function tablesOf(...files: string[]) {
  const out = [];
  for (const f of files) out.push(...parseAnchoredTables(await readFile(join(dir, ...f.split("/")), "utf8")));
  return out;
}

test("with nothing on file, every G1 criterion is an ask", async () => {
  const tables = await tablesOf("01-Organisation/sponsor-brief.md", "01-Organisation/stakeholder-map.md", "03-Systems/systems-inventory.md");
  const qs = coach({ findings: [], gates: [G1], tables });
  const gate = qs.filter((q) => q.source === "gate");
  assert.equal(gate.length, 4);
  assert.ok(gate.every((q) => q.work === "ask"));
  assert.deepEqual(verifyFirst(qs), []);
});

test("a populated sponsor brief turns the sponsor criterion into a verify, quoting what is on file", async () => {
  await fillCells(dir, "01-Organisation/sponsor-brief.md", "sponsor-brief.questions", [{
    Question: "What are you trying to accomplish?",
    Answer: "I want to stop finding out about write-offs at quarter close.",
  }]);
  const tables = await tablesOf("01-Organisation/sponsor-brief.md", "01-Organisation/stakeholder-map.md", "03-Systems/systems-inventory.md");
  const qs = coach({ findings: [], gates: [G1], tables });
  const sponsor = qs.find((q) => /real problem/.test(q.key))!;
  assert.equal(sponsor.work, "verify");
  assert.equal(sponsor.who, "FDE");
  assert.match(sponsor.ask, /on file \(sponsor-brief\.md\): "I want to stop finding out about write-offs at quarter close\."/);
  assert.match(sponsor.ask, /Say it now/);
  assert.equal(sponsor.location, "01-Organisation/sponsor-brief.md");
  // It is not asked of anyone at the client.
  assert.ok(!nextConversations(qs, 10).some((g) => g.questions.some((q) => q.key === sponsor.key)));
  assert.deepEqual(verifyFirst(qs).map((q) => q.key), [sponsor.key]);
  // The other criteria still ask.
  assert.equal(qs.find((q) => /Stakeholder map/.test(q.key))!.work, "ask");
});

test("process owner and exception holder named on file turns the stakeholder criterion into a verify", async () => {
  await fillCells(dir, "01-Organisation/stakeholder-map.md", "stakeholder-map.five-roles", [
    { Role: "Process owner", Name: "Priya Shah" },
    { Role: "Exception holder", Name: "Marcus Bell" },
  ]);
  const tables = await tablesOf("01-Organisation/sponsor-brief.md", "01-Organisation/stakeholder-map.md", "03-Systems/systems-inventory.md");
  const qs = coach({ findings: [], gates: [G1], tables });
  const sm = qs.find((q) => /Stakeholder map/.test(q.key))!;
  assert.equal(sm.work, "verify");
  assert.match(sm.ask, /3 of the five roles are named on file/);
  assert.match(sm.ask, /process owner — Priya Shah; exception holder — Marcus Bell/);
  assert.match(sm.ask, /still unnamed: operator, systems gatekeeper/);
  // The unnamed roles are still asked for, separately, as before.
  assert.ok(qs.some((q) => q.source === "stakeholder" && /operator/.test(q.ask)));
});

test("systems on file turns the readiness criterion into a verify that still asks about landmines", async () => {
  await appendRows(dir, "03-Systems/systems-inventory.md", "systems-inventory.applications", [
    { System: "SAP", Purpose: "Short pays land here" },
    { System: "Excel", Purpose: "Weekly export" },
  ]);
  const tables = await tablesOf("01-Organisation/sponsor-brief.md", "01-Organisation/stakeholder-map.md", "03-Systems/systems-inventory.md", "03-Systems/readiness-scorecard.md");
  const qs = coach({ findings: [], gates: [G1], tables });
  const rs = qs.find((q) => /Readiness scorecard/.test(q.key))!;
  assert.equal(rs.work, "verify");
  assert.match(rs.ask, /2 system\(s\) on file \(systems-inventory\.md\): SAP, Excel\. Readiness scorecard: 0 source\(s\) scored/);
  assert.match(rs.ask, /landmine is a named blocker with a named owner/);
  // Evidence terms have no instrument the coach can read a signature from: still an ask.
  assert.equal(qs.find((q) => /Evidence-handling/.test(q.key))!.work, "ask");
});
