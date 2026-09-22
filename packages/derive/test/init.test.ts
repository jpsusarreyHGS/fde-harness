/**
 * One scaffold, not two.
 *
 * The engagement tree used to be enumerated in two places — `SUBDIRS` here and
 * a bash brace-expansion block in `init-engagement/SKILL.md`. They agreed by
 * luck, nothing enforced it, and the prose copy did not work on the platform
 * this harness is primarily used on: PowerShell takes `{a,b}` literally and
 * creates one directory with a comma in its name.
 *
 * These tests hold the code path to what the prose promised, and hold the
 * prose to not re-growing a second copy of the list.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { initEngagement, validateVars, InitRefused, engagementSubdirs } from "../src/init.ts";
import { parseAnchoredTables, dataRows, findTable } from "../src/anchors.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");

let tmp: string;
let dir: string;

const VARS = {
  CLIENT_NAME: "Northwind Insurance",
  SPONSOR: "Director, Claims Operations",
  SCOPE: "First-notice-of-loss triage",
  NON_GOALS: "No adjudication.",
  DATE: "2026-09-10",
};

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-init-"));
  dir = join(tmp, "engagements", "northwind");
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

test("a fresh scaffold produces the whole tree, both trees, and derived state", async () => {
  const res = await initEngagement({
    engagementDir: dir,
    harnessRoot: HARNESS,
    vars: validateVars(VARS, "northwind"),
  });

  assert.equal(res.backfill, false);
  assert.equal(res.stateWritten, true);

  // Every path is a real directory name — no literal braces, no commas.
  const dirs = await engagementSubdirs(dir);
  for (const d of dirs) {
    assert.ok(!d.includes("{") && !d.includes(","), `brace-expansion survived into ${d}`);
  }
  for (const expected of [
    "02-Workflow/evidence/observed", "02-Workflow/evidence/system",
    "02-Workflow/evidence/documented", "02-Workflow/evidence/stated",
    "02-Workflow/proposals", "06-Evals/golden-sets", "chronicle/run-events",
  ]) {
    assert.ok(dirs.includes(expected), `missing ${expected}`);
  }

  // Parity with what the skill used to promise by hand.
  assert.equal(res.created.filter((f) => f.startsWith("harness-improver/feedback/")).length, 8);
  const deliverables = await engagementSubdirs(join(tmp, "deliverables", "northwind"));
  assert.equal(deliverables.length, 10);

  const state = JSON.parse(await readFile(join(dir, "state.json"), "utf8"));
  assert.equal(state.engagement.client, "Northwind Insurance");
});

test("values left unresolved become questions with an owner, not blank cells", async () => {
  const md = await readFile(join(dir, "02-Workflow", "open-questions.md"), "utf8");
  const t = findTable(parseAnchoredTables(md), "open-questions.rows")!;
  const rows = dataRows(t);
  assert.ok(rows.length >= 2, `expected TBD questions, got ${rows.length}`);
  for (const r of rows) {
    assert.ok(r["Who can answer"]?.trim(), `${r["Id"]} has nobody to ask`);
    assert.ok(r["Blocks"]?.trim(), `${r["Id"]} blocks nothing on record`);
  }
  // RESIDENCY defaults to tbd, and unsettled residency is what hard-stops
  // capture — so it must be one of them.
  assert.ok(rows.some((r) => /residency|evidence live/i.test(r["Question"] ?? "")));
});

test("re-running backfills without overwriting or duplicating questions", async () => {
  const before = await readFile(join(dir, "02-Workflow", "open-questions.md"), "utf8");
  await rm(join(dir, "03-Systems", "systems-inventory.md"));

  const res = await initEngagement({
    engagementDir: dir,
    harnessRoot: HARNESS,
    vars: validateVars(VARS, "northwind"),
  });

  assert.equal(res.backfill, true);
  assert.deepEqual(res.created, ["03-Systems/systems-inventory.md"]);
  assert.deepEqual(res.questionsRaised, [], "a re-run must not raise the same questions again");
  assert.equal(await readFile(join(dir, "02-Workflow", "open-questions.md"), "utf8"), before);
});

test("a placeholder surviving on disk is reported, even when nothing was written", async () => {
  // The scaffolder's own `unresolved` only covers files it wrote, so on a
  // migration run it is empty no matter what the live files hold. That is
  // exactly backwards, and this is the check that catches it.
  const brief = join(dir, "01-Organisation", "sponsor-brief.md");
  await writeFile(brief, (await readFile(brief, "utf8")) + "\n{{LEFTOVER}}\n", "utf8");

  const res = await initEngagement({
    engagementDir: dir,
    harnessRoot: HARNESS,
    vars: validateVars(VARS, "northwind"),
  });

  assert.deepEqual(res.created, []);
  assert.deepEqual(res.survivingPlaceholders, [
    { file: "01-Organisation/sponsor-brief.md", keys: ["LEFTOVER"] },
  ]);
});

test("vars arriving as JSON are validated, not trusted", () => {
  assert.throws(() => validateVars({ CLIENT_NAME: "X" }, "s"), (e: Error) => {
    assert.ok(e instanceof InitRefused);
    assert.match(e.message, /SPONSOR, SCOPE, NON_GOALS/);
    return true;
  });
  assert.throws(
    () => validateVars({ ...VARS, RESIDENCY: "our-laptop" }, "s"),
    /not one of: client-tenant, hgs-tenant, tbd/,
  );
  assert.throws(
    () => validateVars({ ...VARS, LABOUR: "maybe" }, "s"),
    /not one of: works-council, union, none, unknown/,
  );
  // A slug mismatch would scaffold a directory the operator is not watching.
  assert.throws(() => validateVars({ ...VARS, SLUG: "other" }, "northwind"), /Fix one/);
  // And the path always wins when the field is absent.
  assert.equal(validateVars(VARS, "northwind").SLUG, "northwind");
});

test("the skill no longer carries its own copy of the directory list", async () => {
  const skill = await readFile(
    join(HARNESS, ".claude", "skills", "skills-function", "init-engagement", "SKILL.md"),
    "utf8",
  );
  // Brace expansion is the specific shape that broke on Windows. Its absence
  // is the property worth pinning — not the wording around it.
  assert.ok(
    !/\{00-Setup|\{golden-sets|\{observed,/.test(skill),
    "SKILL.md has grown a second directory list; scaffold.ts is the only one",
  );
  assert.match(skill, /cli\.ts scaffold/, "SKILL.md must delegate to the scaffold subcommand");
});

// ------------------------------------------------ item 9: non-goals

test("NON_GOALS of 'none stated — confirm with sponsor' becomes a Q- for the sponsor", async () => {
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { initEngagement, validateVars } = await import("../src/init.ts");
  const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
  const tmp = await mkdtemp(join(tmpdir(), "fde-nongoals-"));
  try {
    const vars = validateVars({
      CLIENT_NAME: "Solara Foods", SPONSOR: "Dana Whitfield", SCOPE: "Deductions",
      NON_GOALS: "none stated — confirm with sponsor", RESIDENCY: "client-tenant", LABOUR: "none",
    }, "solara-foods");
    const dir = join(tmp, "engagements", "solara-foods");
    const res = await initEngagement({ engagementDir: dir, harnessRoot: HARNESS, vars, deliverablesRoot: join(tmp, "deliverables") });
    assert.ok(res.questionsRaised.length >= 1);
    const oq = await readFile(join(dir, "02-Workflow", "open-questions.md"), "utf8");
    assert.match(oq, /What has the client explicitly said this engagement will not do/);
    assert.match(oq, /NON_GOALS was left unresolved at init\./);
    assert.match(oq, /Executive sponsor/);
    // And the scaffolded evidence folder carries its README.
    await readFile(join(dir, "02-Workflow", "evidence", "README.md"), "utf8");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
