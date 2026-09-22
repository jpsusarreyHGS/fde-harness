/**
 * Item 1 of the SIM-01 brief: `/capture` under-extracted into the stage-01
 * and stage-03 instruments. A source naming four stakeholders produced a
 * stakeholder map holding one, and nothing said so until the gate.
 *
 * Two things are under test. The sweep — the regex floor — must find what a
 * first-time reader would find in the fixtures. And the coverage block must
 * flag an instrument the source supported that got no rows, while staying
 * silent for one the source never supported: a flag that fires on nothing is
 * a flag people learn to ignore.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { coverage, formatCoverage, formatSweep, sweepText } from "../src/sweep.ts";
import { scaffoldEngagement } from "../src/scaffold.ts";
import { proposeFromSpec, acceptProposal } from "../src/proposals.ts";
import { parseAnchoredTables, findTable } from "../src/anchors.ts";
import { WriteRefused } from "../src/writer.ts";

const run = promisify(execFile);
const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");
const CLI = join(HARNESS, "packages", "derive", "src", "cli.ts");
const FIXTURE = join(import.meta.dirname, "fixtures", "sim-interview-notes.md");
const CALDERA = join(HARNESS, "examples", "caldera-logistics", "evidence");

let notes: string;
let tmp: string;
let dir: string;

before(async () => {
  notes = await readFile(FIXTURE, "utf8");
  tmp = await mkdtemp(join(tmpdir(), "fde-sweep-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Solara Foods", SLUG: "solara-foods", SPONSOR: "Dana Whitfield, VP Finance",
      SCOPE: "Deductions", NON_GOALS: "No changes to the retailer portals.",
      RESIDENCY: "client-tenant", LABOUR: "none", DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "solara-foods");
  await mkdir(join(dir, "02-Workflow", "evidence", "stated"), { recursive: true });
  await copyFile(FIXTURE, join(dir, "02-Workflow", "evidence", "stated", "2026-09-09-discovery-call.md"));
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

// ---------------------------------------------------------------- the sweep

test("the sweep finds the four named roles in interview notes", () => {
  const r = sweepText(notes, { sponsorName: "Dana Whitfield, VP Finance" });
  const named = Object.fromEntries(r.people.map((p) => [p.name, p.role]));
  assert.equal(named["Dana Whitfield"], "VP Finance");
  assert.equal(named["Priya Shah"], "deductions manager");
  assert.equal(named["Marcus Bell"], "senior deductions analyst");
  assert.equal(named["Lena Ortiz"], "IT business analyst");
  assert.ok(r.people.filter((p) => p.role).length >= 4, "four people with roles");
  assert.equal(r.sponsorMentioned, true);
});

test("the sweep finds the systems and the figures the trap was planted in", () => {
  const r = sweepText(notes);
  assert.deepEqual(r.systems, ["ERP", "SAP", "Excel", "portal"]);
  assert.ok(!r.systems.includes("Access"), '"access to SAP" is not Microsoft Access');
  // The sample-versus-book trap: the SOW figure and the export size both surface.
  assert.ok(r.figures.some((f) => /\$38\.4M/i.test(f)), `SOW figure missing: ${r.figures}`);
  assert.ok(r.figures.some((f) => /60 rows/.test(f)), `export size missing: ${r.figures}`);
  assert.ok(r.figures.some((f) => /18\s?%/.test(f)));
  assert.ok(r.figures.some((f) => /6 week/.test(f)));
  assert.ok(r.terms.includes("SOW"));
  assert.ok(r.terms.includes("CFO"));
});

test("a shadowing note: the operator with a role, the bare names, the channels", async () => {
  const md = await readFile(join(CALDERA, "observed", "2026-09-17-booking-desk.md"), "utf8");
  const r = sweepText(md);
  const tomasz = r.people.find((p) => p.name === "Tomasz Nowak");
  assert.ok(tomasz, `Tomasz missing from ${JSON.stringify(r.people)}`);
  assert.equal(tomasz.role, "booking coordinator");
  // Mentioned by first name mid-sentence, no role stated: still a person to
  // put in the map, with the role as a question.
  for (const n of ["Marta", "Yusuf"]) {
    assert.ok(r.people.some((p) => p.name === n && p.role === null), `${n} should be named without a role`);
  }
  for (const s of ["TMS", "WhatsApp", "email"]) assert.ok(r.systems.includes(s), `${s} missing from ${r.systems}`);
  assert.ok(r.terms.includes("ADR"));
  assert.ok(r.figures.some((f) => /47 bookings/.test(f)));
  assert.ok(r.figures.some((f) => /22 minutes/.test(f)));
});

test("a raw transcript names its speakers through the voice tags", async () => {
  const vtt = await readFile(join(CALDERA, "stated", "2026-09-09-ops-call.vtt"), "utf8");
  const r = sweepText(vtt, { sponsorName: "Marta Oyelaran, VP Operations" });
  assert.ok(r.people.some((p) => p.name === "Marta Oyelaran"));
  assert.ok(r.people.some((p) => p.name === "Dawn"), "Dawn is named as the rep");
  assert.equal(r.sponsorMentioned, true, "the sponsor is the speaker");
  // Written-out figures are the ones a regex most easily misses.
  assert.ok(r.figures.some((f) => /two hundred and forty pounds/i.test(f)), `written figure missing: ${r.figures}`);
});

test("common nouns that start a clause are not people", () => {
  const r = sweepText("The customer emailed. Then the Customer rang again, and Booking desk took it.\nWe told the driver.");
  assert.deepEqual(r.people, []);
});

// ------------------------------------------------------------------ coverage

test("an instrument the source supported that got nothing is flagged", () => {
  const r = sweepText(notes, { sponsorName: "Dana Whitfield" });
  const lines = coverage([
    { instrument: "02-Workflow/observation-log.md", rows: 12 },
  ], r);
  const by = Object.fromEntries(lines.map((l) => [l.id, l]));
  assert.equal(by["stakeholder-map"]!.check, true);
  assert.match(by["stakeholder-map"]!.found!, /source named 4 people/);
  assert.equal(by["systems-inventory"]!.check, true);
  assert.equal(by["sponsor-brief"]!.check, true);
  assert.equal(by["sponsor-brief"]!.unit, "fields");
  assert.equal(by["observation-log"]!.rows, 12);
  assert.equal(by["observation-log"]!.check, false, "no signal, no flag");

  const text = formatCoverage(lines, "p.md", "notes.md");
  assert.match(text, /stakeholder-map\s+0 rows\s+← source named 4 people; nothing extracted\. Check\./);
  assert.match(text, /sponsor-brief\s+0 fields\s+← source contains a sponsor; nothing extracted\. Check\./);
  assert.match(text, /observation-log\s+12 rows proposed/);
});

test("rows proposed against what was found reads as a comparison, not a flag", () => {
  const r = sweepText(notes, { sponsorName: "Dana Whitfield" });
  const lines = coverage([
    { instrument: "01-Organisation/stakeholder-map.md", rows: 1 },
    { instrument: "01-Organisation/stakeholder-map.md", rows: 3 },
    { instrument: "03-Systems/systems-inventory.md", rows: 3 },
  ], r);
  const text = formatCoverage(lines, "p.md", "notes.md");
  assert.match(text, /stakeholder-map\s+4 rows proposed\s+\(source named 4 people\)/);
  assert.match(text, /systems-inventory\s+3 rows proposed\s+\(source named 4 systems\)/);
  assert.ok(!/stakeholder-map.*Check/.test(text));
  assert.ok(!/systems-inventory.*Check/.test(text), "fewer rows than the sweep found is a comparison, not a flag");
});

test("REGRESSION: a source naming nobody prints the zero, not the flag", () => {
  const r = sweepText("06:04 opened the queue. 06:09 re-keyed the reference. Dead time waiting on the core system, 40 seconds.");
  const lines = coverage([{ instrument: "02-Workflow/observation-log.md", rows: 3 }], r);
  const sm = lines.find((l) => l.id === "stakeholder-map")!;
  assert.equal(sm.check, false);
  assert.equal(sm.signal, 0);
  const text = formatCoverage(lines, "p.md", "shift.md");
  assert.match(text, /stakeholder-map\s+0 rows\s+\(source named 0 people\)/);
  assert.ok(!/Check\./.test(text.split("\n").find((l) => /stakeholder-map/.test(l))!));
  assert.match(text, /Nothing the sweep found went unextracted/);
});

test("the sweep report names where each thing goes", () => {
  const text = formatSweep(sweepText(notes, { sponsorName: "Dana Whitfield" }), "notes.md", "stated");
  assert.match(text, /^SWEEP — notes\.md \(stated\) — a floor, not a proposal; nothing written/);
  assert.match(text, /People named \(\d+\)\s+→ stakeholder-map/);
  assert.match(text, /Dana Whitfield — VP Finance/);
  assert.match(text, /Systems named \(\d+\)\s+→ systems-inventory\.applications/);
  assert.match(text, /→ sponsor-brief: mentioned/);
});

// ------------------------------------------------------- fill: labels tables

test("a name for one of the five roles lands by fill, through propose and accept", async () => {
  const { name } = await proposeFromSpec(dir, {
    source: "2026-09-09-discovery-call.md",
    agent: "discovery-analyst",
    blocks: [{
      instrument: "01-Organisation/stakeholder-map.md",
      anchor: "stakeholder-map.five-roles",
      mode: "fill",
      columns: ["Role", "Name"],
      rows: [
        { Role: "Process owner", Name: "Priya Shah" },
        { Role: "Exception holder", Name: "Marcus Bell" },
      ],
    }, {
      instrument: "01-Organisation/sponsor-brief.md",
      anchor: "sponsor-brief.questions",
      mode: "fill",
      columns: ["Question", "Answer"],
      rows: [{
        Question: "What are you trying to accomplish?",
        Answer: "\"I want to stop finding out about write-offs at quarter close.\"",
      }],
    }],
  });
  const proposal = await readFile(join(dir, "02-Workflow", "proposals", name), "utf8");
  assert.match(proposal, /mode=fill/);
  assert.match(proposal, /fill\(s\) — sets cells on rows the table already has/);

  const res = await acceptProposal(dir, name);
  assert.deepEqual(res.danglingCitations, []);
  assert.equal(res.totalRows, 3);

  const map = parseAnchoredTables(await readFile(join(dir, "01-Organisation", "stakeholder-map.md"), "utf8"));
  const five = findTable(map, "stakeholder-map.five-roles")!;
  const byRole = Object.fromEntries(five.rows.map((r) => [r["Role"]!.replace(/[*]/g, "").trim(), r["Name"]]));
  assert.equal(byRole["Process owner"], "Priya Shah");
  assert.equal(byRole["The exception holder"], "Marcus Bell", "the fill matched through the article and the bold");
  assert.equal(byRole["Executive sponsor"], "Dana Whitfield, VP Finance", "untouched");
  assert.equal(five.rows.length, 5, "a fill never adds a row");

  const brief = parseAnchoredTables(await readFile(join(dir, "01-Organisation", "sponsor-brief.md"), "utf8"));
  const q = findTable(brief, "sponsor-brief.questions")!;
  assert.match(q.rows[0]!["Answer"]!, /quarter close/);
});

test("a fill on a role the template does not have is refused at propose time, with the keys", async () => {
  await assert.rejects(
    () => proposeFromSpec(dir, {
      source: "x.md", agent: "discovery-analyst",
      blocks: [{
        instrument: "01-Organisation/stakeholder-map.md", anchor: "stakeholder-map.five-roles",
        mode: "fill", columns: ["Role", "Name"], rows: [{ Role: "Chief wizard", Name: "Merlin" }],
      }],
    }),
    (e: Error) => e instanceof WriteRefused && /no row "Chief wizard"/.test(e.message) && /exception holder/.test(e.message),
  );
});

test("a fill never overwrites a cell someone already filled", async () => {
  const { name } = await proposeFromSpec(dir, {
    source: "x.md", agent: "discovery-analyst",
    blocks: [{
      instrument: "01-Organisation/stakeholder-map.md", anchor: "stakeholder-map.five-roles",
      mode: "fill", columns: ["Role", "Name"], rows: [{ Role: "Process owner", Name: "Somebody Else" }],
    }],
  });
  await assert.rejects(
    () => acceptProposal(dir, name),
    (e: Error) => e instanceof WriteRefused && /already holds "Priya Shah"/.test(e.message),
  );
});

test("appending rows to a labels table is still refused, and says to fill instead", async () => {
  await assert.rejects(
    () => proposeFromSpec(dir, {
      source: "x.md", agent: "discovery-analyst",
      blocks: [{
        instrument: "01-Organisation/stakeholder-map.md", anchor: "stakeholder-map.five-roles",
        columns: ["Role", "Name"], rows: [{ Role: "Operator", Name: "X" }],
      }],
    }),
    (e: Error) => e instanceof WriteRefused && /use mode=fill/.test(e.message),
  );
});

// ------------------------------------------------------------------- the CLI

test("cli sweep finds a source by bare filename and prints the floor", async () => {
  const { stdout } = await run(process.execPath, [CLI, "sweep", dir, "2026-09-09-discovery-call.md"]);
  assert.match(stdout, /SWEEP — 02-Workflow\/evidence\/stated\/2026-09-09-discovery-call\.md \(stated\)/);
  assert.match(stdout, /People named \(4\)/);
  assert.match(stdout, /Priya Shah — deductions manager/);
});

test("cli sweep --against exits 1 when a supported instrument got nothing", async () => {
  const { name } = await proposeFromSpec(dir, {
    source: "2026-09-09-discovery-call.md", agent: "discovery-analyst",
    blocks: [{
      instrument: "02-Workflow/open-questions.md", anchor: "open-questions.rows",
      prefix: "Q", idColumn: "Id", columns: ["Id", "Question"],
      rows: [{ Question: "Who signs off a dispute above $10k when Dana is travelling?" }],
    }],
  });
  let code = 0;
  let stdout = "";
  try {
    ({ stdout } = await run(process.execPath, [CLI, "sweep", dir, "2026-09-09-discovery-call.md", "--against", name]));
  } catch (e) {
    code = (e as { code: number }).code;
    stdout = (e as { stdout: string }).stdout;
  }
  assert.equal(code, 1);
  assert.match(stdout, /open-questions\s+1 rows proposed/);
  assert.match(stdout, /systems-inventory\s+0 rows\s+← source named 4 systems; nothing extracted\. Check\./);
});

test("cli propose prints coverage when it can find the source", async () => {
  const spec = join(tmp, "spec.json");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(spec, JSON.stringify({
    source: "2026-09-09-discovery-call.md", agent: "discovery-analyst",
    blocks: [{
      instrument: "03-Systems/systems-inventory.md", anchor: "systems-inventory.applications",
      columns: ["System", "Purpose"],
      rows: [{ System: "SAP", Purpose: "Short pays land here" }, { System: "Excel", Purpose: "Weekly export" }, { System: "Trade promotion portal", Purpose: "Promotion match" }],
    }],
  }));
  const { stderr } = await run(process.execPath, [CLI, "propose", dir, spec]);
  assert.match(stderr, /COVERAGE — /);
  assert.match(stderr, /systems-inventory\s+3 rows proposed\s+\(source named 4 systems\)/);
  assert.match(stderr, /stakeholder-map\s+0 rows\s+← source named 4 people/);
});
