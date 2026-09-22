/**
 * Item 8 of the SIM-01 brief: a rendered page "included a bunch of meta
 * context directly from the calls, like dropping people's names and
 * describing the constraints." The render skill said to check. Nothing
 * enforced it.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { appendRows, fillCells } from "../src/writer.ts";
import { clientSafe, formatRedactionReport, loadNames, loadObserved } from "../src/clientsafe.ts";
import { renderSketch } from "../src/sketch.ts";

const run = promisify(execFile);
const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");

const FIXTURE = `# Operating map — Solara Foods

Priya Shah exports the short pays every Monday; Dana Whitfield signs off anything over $10k.

| # | Step | Actor | Source |
|---|---|---|---|
| 1 | Export short pays | Priya Shah | EV-001 |
| 2 | Match to a promotion | Analyst | EV-002, EX-002 |

The write-off rule rests on EV-001, EX-002 and REQ-003.

Source: EV-001, EX-002

> "Four hundred kilos a pallet unless it's drinks. Drinks is seven hundred."

Shah thinks the CFO signs when Dana is travelling.
`;

let tmp: string;
let dir: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-safe-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Solara Foods", SLUG: "solara-foods", SPONSOR: "Dana Whitfield, VP Finance",
      SCOPE: "Deductions", NON_GOALS: "None.", RESIDENCY: "client-tenant", LABOUR: "none", DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "solara-foods");
  await fillCells(dir, "01-Organisation/stakeholder-map.md", "stakeholder-map.five-roles", [
    { Role: "Process owner", Name: "Priya Shah" },
  ]);
  await appendRows(dir, "00-Setup/client-safe-names.md", "client-safe-names.rows", [
    { Name: "Dana Whitfield", Role: "Executive sponsor", "Approved by": "Dana Whitfield", Date: "2026-09-22" },
  ]);
  await mkdir(join(dir, "02-Workflow", "evidence", "observed"), { recursive: true });
  await writeFile(join(dir, "02-Workflow", "evidence", "observed", "shift.md"), [
    "06:25  A booking with no weight on it.",
    '       > "Four hundred kilos a pallet unless it\'s drinks. Drinks is seven',
    '       > hundred."',
  ].join("\n"), "utf8");
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

test("the allow-listed name stays, the other becomes a role, citations and Source go", async () => {
  const { roles, allow } = await loadNames(dir);
  assert.equal(roles.get("Priya Shah"), "the process owner");
  assert.equal(roles.get("Dana Whitfield"), "the executive sponsor", "the sponsor is in the map too");
  assert.ok(allow.has("Dana Whitfield"));

  const res = clientSafe(FIXTURE, { roles, allow });
  const t = res.text;
  assert.match(t, /Dana Whitfield signs off/, "allow-listed name kept");
  assert.match(t, /the process owner exports the short pays/, "unlisted name becomes a role");
  assert.match(t, /\| 1 \| Export short pays \| the process owner \|/, "in table cells too");
  assert.match(t, /the process owner thinks the CFO signs/, "surname alone is still the person");
  assert.ok(!/Priya|Shah/.test(t), "no trace of the name");
  assert.ok(!/\b(EV|EX|REQ)-\d+/.test(t), "no harness ids");
  assert.ok(!/^Source:/m.test(t), "no Source: line");
  assert.match(t, /The write-off rule rests on\.?$/m, "citation removed cleanly");
  assert.match(t, /\| 1 \| Export short pays \| the process owner \|\s*\|/, "Source column cleared, table intact");
});

test("the redaction report lists exactly what went, and why", async () => {
  const { roles, allow } = await loadNames(dir);
  const res = clientSafe(FIXTURE, { roles, allow });
  const kinds = res.redactions.map((r) => r.kind);
  assert.equal(kinds.filter((k) => k === "name").length, 3, "Priya on three lines");
  // Ids inside the Source column are cleared as the column, once — not
  // reported again as citations. One citation entry: the sentence.
  assert.equal(kinds.filter((k) => k === "citation").length, 1);
  assert.equal(kinds.filter((k) => k === "source-line").length, 1);
  assert.equal(kinds.filter((k) => k === "source-column").length, 1);
  const report = formatRedactionReport(res.redactions, "02-Workflow/operating-map.md", "deliverables/x.html");
  assert.match(report, /\*\*6 item\(s\) removed\*\*/);
  assert.match(report, /\| 10 \| EV-001, EX-002, REQ-003 \| harness ids/);
  assert.match(report, /\| \d+ \| Priya Shah → the process owner \| a named individual/);
  assert.match(report, /\| 12 \| Source: EV-001, EX-002 \|/);
});

test("a quote taken verbatim from observed evidence is withheld until confirmed", async () => {
  const { roles, allow } = await loadNames(dir);
  const observed = await loadObserved(dir);
  assert.ok(observed.length >= 1);
  const res = clientSafe(FIXTURE, { roles, allow, observed });
  assert.match(res.text, /\[quotation withheld — confirm before sending\]/);
  assert.ok(!/Four hundred kilos/.test(res.text));
  assert.ok(res.redactions.some((r) => r.kind === "observed-quote"));
  const kept = clientSafe(FIXTURE, { roles, allow, observed, keepQuotes: true });
  assert.match(kept.text, /Four hundred kilos a pallet/);
});

test("when nothing is removed, the report says so — silence is never ambiguous", () => {
  const res = clientSafe("# Plain\n\nNothing internal here.\n", { roles: new Map(), allow: new Set() });
  assert.deepEqual(res.redactions, []);
  assert.match(formatRedactionReport(res.redactions, "a.md", "a.html"), /client-safe pass: nothing removed/);
});

test("--with-citations keeps the ids and says nothing about them", async () => {
  const { roles, allow } = await loadNames(dir);
  const res = clientSafe(FIXTURE, { roles, allow, keepCitations: true });
  assert.match(res.text, /rests on EV-001, EX-002 and REQ-003/);
  assert.ok(!res.redactions.some((r) => r.kind === "citation"));
});

test("the sketch runs the same pass: names become roles, and it writes its own report", async () => {
  await appendRows(dir, "02-Workflow/exception-register.md", "exception-register.rows", [
    { Id: "EX-001", Trigger: "Priya Shah overrides the $200 write-off when the retailer is Walmart", Frequency: "unquantified", "Rule holder (role)": "Deductions manager", Source: "" },
  ]);
  const res = await renderSketch({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: join(tmp, "deliverables"), now: new Date("2026-09-22T10:00:00Z") });
  const html = await readFile(res.absolutePath, "utf8");
  assert.match(html, /the process owner overrides the \$200 write-off/);
  assert.ok(!/Priya/.test(html));
  assert.equal(res.redactions.length, 1);
  const report = await readFile(res.reportPath, "utf8");
  assert.match(report, /Priya Shah → the process owner/);
});

test("scripts/render-deliverable.mjs needs a slug and a path", async () => {
  let code = 0;
  try { await run(process.execPath, [join(HARNESS, "scripts", "render-deliverable.mjs")], { cwd: HARNESS }); } catch (e) { code = (e as { code: number }).code; }
  assert.equal(code, 2);
});
