/**
 * Item 5 of the SIM-01 brief: nothing could be shown to a client before G1,
 * so all three trainees built an alignment page by hand, outside the harness.
 *
 * What is under test is the sketch's honesty: it renders accepted rows with
 * their evidence class, it does not render a pending proposal, and the
 * PROVISIONAL banner is on the page twice.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { appendRows, fillCells } from "../src/writer.ts";
import { mintIds } from "../src/ids.ts";
import { proposeFromSpec } from "../src/proposals.ts";
import { renderSketch, PROVISIONAL } from "../src/sketch.ts";
import { deriveState } from "../src/state.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");

let tmp: string;
let dir: string;
let deliverables: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-sketch-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Solara Foods", SLUG: "solara-foods", SPONSOR: "Dana Whitfield, VP Finance",
      SCOPE: "Deductions", NON_GOALS: "No portal changes.", RESIDENCY: "client-tenant", LABOUR: "none",
      DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "solara-foods");
  deliverables = join(tmp, "deliverables");
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

test("an empty engagement renders an honest, sparse sketch with the banner twice", async () => {
  const res = await renderSketch({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: deliverables, now: new Date("2026-09-22T10:00:00Z") });
  assert.equal(res.path, "solara-foods/sketch/2026-09-22.html");
  assert.equal(res.counts.steps, 0);
  assert.equal(res.counts.exceptions, 0);
  assert.equal(res.counts.constraints, 0);
  // Not question-free: four of the five roles are unnamed, and the coach
  // asks for each. That is the one section a fresh engagement fills honestly.
  assert.ok(res.counts.questions >= 4, `expected the unnamed-role questions, got ${res.counts.questions}`);
  const html = await readFile(res.absolutePath, "utf8");
  assert.match(html, /Who is the process owner\? A name, not a team\./);
  assert.equal((html.match(new RegExp(PROVISIONAL, "g")) ?? []).length, 2, "header and footer");
  assert.match(html, /Nothing accepted yet for this section — no operating-map steps/);
  assert.match(html, /The sponsor's own sentence is not on file yet/);
  assert.match(html, /<h2>What this is not<\/h2>/);
  assert.match(html, /Solara Foods/);
  assert.match(html, /--hgs-impact-green/, "brand tokens inlined");
});

test("accepted rows appear with their evidence class; a pending proposal does not", async () => {
  // An observed row and a stated row in the log, so steps can resolve a class.
  const { ids: ev } = await mintIds(dir, "EV", 2);
  await appendRows(dir, "02-Workflow/observation-log.md", "observation-log.rows", [
    { Id: ev[0]!, Time: "09:12", "Actor (role)": "Deductions analyst", Action: "exported short pays", System: "SAP", Class: "observed" },
    { Id: ev[1]!, Time: "—", "Actor (role)": "Deductions manager", Action: "said they match each to a promotion", System: "portal", Class: "stated" },
  ]);
  await appendRows(dir, "02-Workflow/operating-map.md", "operating-map.steps", [
    { "#": "1", Step: `Export short pays from SAP to Excel (see ${ev[0]})`, Actor: "Deductions analyst", System: "SAP", Source: ev[0]!, Verified: "yes" },
    { "#": "2", Step: "Match each deduction to a promotion", Actor: "Deductions analyst", System: "Trade promotion portal", Source: ev[1]!, Verified: "" },
    { "#": "3", Step: "Decide whether to dispute", Actor: "Deductions manager", System: "", Source: "", Verified: "" },
  ]);
  const { ids: ex } = await mintIds(dir, "EX", 1);
  await appendRows(dir, "02-Workflow/exception-register.md", "exception-register.rows", [
    { Id: ex[0]!, Trigger: "Deduction under $200", Frequency: "unquantified", "Current handling": "written off without review", "Rule holder (role)": "Deductions manager", Source: ev[1]! },
  ]);
  await appendRows(dir, "03-Systems/readiness-scorecard.md", "readiness-scorecard.rows", [
    { Source: "SAP", Available: "yes", Accessible: "no", Quality: "?", Score: "2", Blocker: "service account needs a 6-week ERP review", "Blocker owner": "IT business analyst", "Target date": "2026-11-01" },
  ]);
  await fillCells(dir, "01-Organisation/sponsor-brief.md", "sponsor-brief.questions", [
    { Question: "What are you trying to accomplish?", Answer: "I want to stop finding out about write-offs at quarter close." },
  ]);
  // A step that exists only in a proposal nobody has accepted.
  await proposeFromSpec(dir, {
    source: "notes.md", agent: "discovery-analyst",
    blocks: [{
      instrument: "02-Workflow/operating-map.md", anchor: "operating-map.steps",
      columns: ["#", "Step"], rows: [{ "#": "4", Step: "PENDING-ONLY STEP escalate to CFO" }],
    }],
  });

  const res = await renderSketch({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: deliverables, now: new Date("2026-09-23T10:00:00Z") });
  assert.deepEqual(res.counts, { steps: 3, exceptions: 1, deadEnds: 0, questions: res.counts.questions, constraints: 1 });
  const html = await readFile(res.absolutePath, "utf8");

  // The sponsor's sentence, verbatim.
  assert.match(html, /<blockquote>I want to stop finding out about write-offs at quarter close\.<\/blockquote>/);
  // Each step carries the class of the observation it cites.
  assert.match(html, /Export short pays from SAP to Excel[^<]*<\/strong>[\s\S]{0,200}?<span class="badge observed">observed<\/span>/);
  assert.match(html, /Match each deduction to a promotion<\/strong>[\s\S]{0,200}?<span class="badge stated">stated<\/span>/);
  assert.match(html, /Decide whether to dispute<\/strong>[\s\S]{0,200}?<span class="badge unverified">unverified<\/span>/);
  // Harness ids do not leave the building.
  assert.ok(!/\bEV-\d+/.test(html), "no EV- ids in the page");
  assert.ok(!/\bEX-\d+/.test(html), "no EX- ids in the page");
  // The exception, with its unquantified badge and the rule holder as a role.
  assert.match(html, /Deduction under \$200[\s\S]{0,300}?<span class="badge unquantified">unquantified<\/span>[\s\S]{0,200}?decided by the deductions manager/);
  // The constraint.
  assert.match(html, /SAP: service account needs a 6-week ERP review[\s\S]{0,100}?owner: IT business analyst/);
  // The pending step is not there.
  assert.ok(!/PENDING-ONLY STEP/.test(html), "a pending proposal is never read");
  assert.equal((html.match(new RegExp(PROVISIONAL, "g")) ?? []).length, 2);
});

test("gate criteria and compiler refusals never reach the page — they are about our process", async () => {
  const { writeFile } = await import("node:fs/promises");
  // A G1 memo with five unowned criteria: the coach turns that into "who owns
  // each?", which is a question for us, not for the client.
  const memo = await readFile(join(dir, "engagement-management", "stage-gate-1-readiness.md"), "utf8");
  await writeFile(
    join(dir, "engagement-management", "stage-gate-1-readiness.md"),
    memo.replace(/\| Recommendation \|\s*\|/, "| Recommendation | NOT READY |")
      .replace(/(\| Operating map[^\n]*?\|)\s*\|/, "$1 unmet |"),
    "utf8",
  );
  const res = await renderSketch({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: deliverables, now: new Date("2026-09-24T10:00:00Z") });
  const html = await readFile(res.absolutePath, "utf8");
  // The banner says "pre-G1" on purpose; the gate's *criteria* must not appear.
  assert.equal((html.match(/G1/g) ?? []).length, 2, "G1 appears only in the two banners");
  assert.ok(!/criteria have no owner/.test(html));
  assert.ok(!/G1 — 03→04/.test(html));
  assert.match(html, /Who is the systems gatekeeper\? A name, not a team\./, "the client's unnamed roles still appear");
});

test("state.json lists sketches apart from deliverables", async () => {
  const state = await deriveState({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: deliverables });
  assert.deepEqual(state.sketches, [
    { date: "2026-09-22", path: "solara-foods/sketch/2026-09-22.html" },
    { date: "2026-09-23", path: "solara-foods/sketch/2026-09-23.html" },
    { date: "2026-09-24", path: "solara-foods/sketch/2026-09-24.html" },
  ]);
  assert.ok(!state.deliverables.some((d) => /sketch/.test(d.stage)), "a sketch is not a deliverable");
});
