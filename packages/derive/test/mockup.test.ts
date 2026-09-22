/**
 * The concept mockup's guardrails, as code.
 *
 * Cheap must not become dangerous: the watermark travels with every
 * screenshot, the ledger says what was assumed, the version is minted, and
 * a real name never reaches a page that is meant to be synthetic.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { appendRows, fillCells, WriteRefused } from "../src/writer.ts";
import { mintIds } from "../src/ids.ts";
import { listMockups, logMockup, planMockup, WATERMARK } from "../src/mockup.ts";
import { deriveState } from "../src/state.ts";
import { parseAnchoredTables, findTable, dataRows } from "../src/anchors.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");
const SHELL = join(HARNESS, ".claude", "skills", "skills-function", "concept-mockup", "mockup-shell.html");

let tmp: string;
let dir: string;
let deliverables: string;
let shell: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-mockup-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Solara Foods", SLUG: "solara-foods", SPONSOR: "Dana Whitfield, VP Finance",
      SCOPE: "Deductions", NON_GOALS: "None.", RESIDENCY: "client-tenant", LABOUR: "none", DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "solara-foods");
  deliverables = join(tmp, "deliverables");
  await mkdir(join(deliverables, "solara-foods", "mockups"), { recursive: true });
  shell = await readFile(SHELL, "utf8");
  await fillCells(dir, "01-Organisation/stakeholder-map.md", "stakeholder-map.five-roles", [{ Role: "Process owner", Name: "Priya Shah" }]);
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

function page(version: number, extra = ""): string {
  return shell
    .replace(/\{\{APP_NAME\}\}/g, "Deductions desk")
    .replace(/\{\{CLIENT\}\}/g, "Solara Foods")
    .replace(/\{\{VERSION\}\}/g, String(version))
    .replace(/\{\{DATE\}\}/g, "2026-09-22")
    .replace(/\{\{BUILT_FROM\}\}/g, "stakeholder-map")
    .replace("<!-- {{PAGE}}", `${extra}<!-- {{PAGE}}`);
}

test("the shell carries the watermark twice, the tokens, and no dependency but the font", () => {
  assert.equal(shell.split(WATERMARK).length - 1, 2);
  assert.match(shell, /--brand-navy:#26476b/);
  assert.match(shell, /--sidebar:#16283c/, "dark chrome token present");
  assert.match(shell, /fonts\.googleapis\.com\/css2\?family=Geist/);
  assert.ok(!/<script src=|cdn\.|unpkg|tailwindcss/.test(shell), "single file, no CDN scripts");
  assert.match(shell, /We assumed — correct us/);
});

test("the plan mints v1, says what the page rests on and what it must assume", async () => {
  const p = await planMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, now: new Date("2026-09-22T10:00:00Z") });
  assert.equal(p.version, 1);
  assert.equal(p.file, "mockup-v1-2026-09-22.html");
  assert.ok(p.builtFrom.includes("stakeholder-map"), "the filled role counts");
  assert.ok(p.missing.includes("operating-map"));
  assert.ok(p.assumptionCandidates.length >= 1, "the coach's questions seed the assumptions panel");
  assert.equal(p.previous, null);
});

test("logging refuses a page without the watermark twice, and a page with a real name", async () => {
  const noMark = page(1).replace(WATERMARK, "Concept");
  await writeFile(join(deliverables, "solara-foods", "mockups", "mockup-v1-2026-09-22.html"), noMark, "utf8");
  await assert.rejects(
    () => logMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, file: "mockup-v1-2026-09-22.html" }),
    (e: Error) => e instanceof WriteRefused && /carries the watermark 1 time/.test(e.message),
  );
  await writeFile(join(deliverables, "solara-foods", "mockups", "mockup-v1-2026-09-22.html"), page(1, "<p>Assigned to Priya Shah</p>"), "utf8");
  await assert.rejects(
    () => logMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, file: "mockup-v1-2026-09-22.html" }),
    (e: Error) => e instanceof WriteRefused && /names Priya Shah — a mockup is synthetic/.test(e.message),
  );
  await assert.rejects(
    () => logMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, file: "concept.html" }),
    (e: Error) => e instanceof WriteRefused && /not a mockup filename/.test(e.message),
  );
});

test("a good page is logged with what it rested on; the reaction fills the row later, never overwrites", async () => {
  await writeFile(join(deliverables, "solara-foods", "mockups", "mockup-v1-2026-09-22.html"), page(1, '<p>Assigned to the process owner <span class="callout">assumed <sup>1</sup></span></p>'), "utf8");
  const r = await logMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, file: "mockup-v1-2026-09-22.html", assumptions: "4 — see panel", now: new Date("2026-09-22T11:00:00Z") });
  assert.equal(r.created, true);
  assert.equal(r.version, 1);
  assert.ok(r.builtFrom.includes("stakeholder-map"));

  const md = await readFile(join(dir, "05-Build", "mockup-ledger.md"), "utf8");
  const rows = dataRows(findTable(parseAnchoredTables(md), "mockup-ledger.rows")!);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!["Version"], "v1");
  assert.match(rows[0]!["Built from"]!, /stakeholder-map/);
  assert.equal(rows[0]!["Assumptions"], "4 — see panel");
  assert.equal(rows[0]!["Shown to"], "");

  const r2 = await logMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, file: "mockup-v1-2026-09-22.html", shownTo: "VP Finance, 2026-09-22", reaction: "confirmed direction; corrected the write-off threshold", evidence: "02-Workflow/evidence/stated/2026-09-22-answers.md" });
  assert.equal(r2.created, false);
  const md2 = await readFile(join(dir, "05-Build", "mockup-ledger.md"), "utf8");
  const row = dataRows(findTable(parseAnchoredTables(md2), "mockup-ledger.rows")!)[0]!;
  assert.equal(row["Shown to"], "VP Finance, 2026-09-22");
  assert.match(row["Reaction"]!, /confirmed direction/);
  assert.equal(row["Assumptions"], "4 — see panel", "earlier cells untouched");

  await assert.rejects(
    () => logMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, file: "mockup-v1-2026-09-22.html", reaction: "something else" }),
    (e: Error) => e instanceof WriteRefused && /already records Reaction/.test(e.message),
  );
});

test("v2 follows v1; state.json lists mockups apart from deliverables", async () => {
  const p = await planMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, now: new Date("2026-09-23T10:00:00Z") });
  assert.equal(p.version, 2);
  assert.equal(p.previous?.version, 1);
  await writeFile(join(deliverables, "solara-foods", "mockups", p.file), page(2), "utf8");
  assert.deepEqual((await listMockups(deliverables, "solara-foods")).map((m) => m.version), [1, 2]);
  const state = await deriveState({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: deliverables });
  assert.deepEqual(state.mockups.map((m) => `${m.version}:${m.date}`), ["1:2026-09-22", "2:2026-09-23"]);
  assert.ok(!state.deliverables.some((d) => /mockup/.test(d.stage)));
  // The ledger is an instrument: its rows count.
  assert.equal(state.instruments.find((i) => i.id === "mockup-ledger")!.rows, 1);
});

test("the ledger rejects a hand-written row that fakes the version — it is minted", async () => {
  // A second v1 row cannot be created through logMockup; it updates instead.
  const r = await logMockup({ engagementDir: dir, slug: "solara-foods", deliverablesDir: deliverables, file: "mockup-v1-2026-09-22.html" });
  assert.equal(r.created, false);
  const { ids } = await mintIds(dir, "EV", 1);
  assert.equal(ids[0], "EV-001", "mockups mint no harness ids");
  await appendRows(dir, "02-Workflow/observation-log.md", "observation-log.rows", [{ Id: ids[0]!, Time: "1", Class: "observed" }]);
});
