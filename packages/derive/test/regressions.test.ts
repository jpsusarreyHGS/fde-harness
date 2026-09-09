/**
 * Regressions from Phase 1, each of which punished correct work.
 *
 * These are pinned as tests because every one of them was introduced by a
 * well-intentioned fix and none of them would have been caught by the
 * existing suite. The pattern is worth remembering: a heuristic that rejects
 * placeholder text will, if it is even slightly too broad, reject the real
 * thing — and it fails silently, in the direction of accusing the FDE.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { expandRange, filled, isOptionList } from "../src/chain.ts";
import { answeredRows, parseAnchoredTables } from "../src/anchors.ts";

// ---------------------------------------------------------------- filled()

test("REGRESSION: a middle dot does not void a cell", () => {
  // `·` is the templates' own house-style separator. The first version of the
  // option-list guard rejected any cell containing one, so an FDE copying
  // house style silently emptied their own work.
  assert.equal(filled("routed to recon · then closed"), true);
  assert.equal(filled("EX-001 · EX-004"), true);
  assert.equal(filled("Claims supervisor · out of hours: duty manager"), true);
});

test("REGRESSION: three or more citations is sourced, not unsourced", () => {
  // The guard counted `/`-separated segments and rejected 3+, so a
  // well-sourced requirement was reported as having no source at all.
  assert.equal(filled("EV-001 / EV-002 / EV-003"), true);
  assert.equal(filled("EV-001, EV-002, EV-003"), true);
  assert.equal(filled("EV-014 / EX-003 / EV-021 / EX-007"), true);
});

test("option lists are still rejected — the original bug stays fixed", () => {
  assert.equal(filled("READY · READY WITH CAVEATS · NOT READY"), false);
  assert.equal(filled("PASS / PASS WITH CAVEATS / FAIL"), false);
  assert.equal(filled("high / med / low"), false);
  assert.equal(filled("observed / system / documented / stated"), false);
  assert.equal(filled("fold-in / discard"), false);
  assert.equal(filled("measured / modelled / assumed"), false);
});

test("isOptionList is narrow on purpose", () => {
  // prose with a slash is prose
  assert.equal(isOptionList("routes to recon / reconciliation queue owner decides"), false);
  // ids are citations, never options
  assert.equal(isOptionList("EV-001 / EV-002"), false);
  // a single value is not a list
  assert.equal(isOptionList("READY"), false);
  // but a full enum is
  assert.equal(isOptionList("yes / no"), true);
});

test("placeholder and blank cells are still empty", () => {
  for (const s of ["", "  ", "-", "—", "n/a", '""', "EV-", "EV- / EX-", "REQ-"]) {
    assert.equal(filled(s), false, `${JSON.stringify(s)} should be empty`);
  }
});

// ------------------------------------------------------------ expandRange

test("an Ev range cites every id it covers", () => {
  // The observation log's session table records "EV-001–EV-004". Reading that
  // as one citation (or none) made a whole session look uncited, so every row
  // of a fresh shadowing session reported as orphan evidence.
  assert.deepEqual(expandRange("EV-001–EV-004"), ["EV-001", "EV-002", "EV-003", "EV-004"]);
  assert.deepEqual(expandRange("EV-008 to EV-010"), ["EV-008", "EV-009", "EV-010"]);
  assert.deepEqual(expandRange("EV-002-EV-003"), ["EV-002", "EV-003"]);
});

test("expandRange falls back to plain extraction when there is no range", () => {
  assert.deepEqual(expandRange("EV-001, EV-009"), ["EV-001", "EV-009"]);
  assert.deepEqual(expandRange(""), []);
});

test("expandRange refuses an absurd range rather than allocating it", () => {
  const out = expandRange("EV-001–EV-999999");
  assert.ok(out.length <= 2, `expected a fallback, got ${out.length} ids`);
});

// ----------------------------------------------------- answered labels rows

test("a labels table counts answers, not rows", () => {
  // The five roles, the six evidence terms, the seven sponsor questions: rows
  // are schema. Counting them made a blank template look populated; ignoring
  // the table entirely made a fully-answered one look empty.
  const md = `
<!-- table:t.five-roles role=labels key=Role answer=Name -->

| Role | Name | What they give you |
|---|---|---|
| Executive sponsor | R. Okonjo | Budget and mandate |
| Process owner |  | The official workflow |
| The operator | — | The real workflow |
`;
  const [t] = parseAnchoredTables(md);
  assert.ok(t);
  assert.equal(t.anchor.role, "labels");
  assert.equal(t.anchor.keyColumn, "Role");
  assert.equal(t.anchor.answerColumn, "Name");
  assert.equal(t.rows.length, 3, "all three rows parse");
  assert.equal(answeredRows(t).length, 1, "only the sponsor is named");
});

test("a labels table with no answer column yields no answers", () => {
  const md = `
<!-- table:t.rungs role=labels key=Rung -->

| Rung | Exit when |
|---|---|
| 1 | stable across volume |
`;
  const [t] = parseAnchoredTables(md);
  assert.ok(t);
  assert.deepEqual(answeredRows(t), []);
});

// --------------------------------------------------------- anchor coverage

test("every template table is anchored, and register tables ship no rows", async () => {
  // Ten instruments had no anchors at all, so an FDE who filled them got a
  // red `empty` badge and a lower stage percentage — the harness punishing
  // correct work. This asserts the whole tree, not just the ten.
  const { readdir, readFile } = await import("node:fs/promises");
  const { join, resolve } = await import("node:path");
  const T = resolve(import.meta.dirname, "..", "..", "..", ".claude", "templates", "engagement-init");

  const files: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith(".md.template")) files.push(p);
    }
  };
  await walk(T);

  const unanchored: string[] = [];
  const seeded: string[] = [];
  for (const f of files) {
    const md = await readFile(f, "utf8");
    const name = f.slice(T.length + 1).replace(/\\/g, "/");
    // chronicle memory files are prose, not instruments, and are not derived
    if (name.startsWith("chronicle/")) continue;

    const tableCount = (md.match(/^\|[^\n]*\|\n\|[-| :]+\|$/gm) ?? []).length;
    const anchorCount = (md.match(/<!-- table:/g) ?? []).length;
    if (tableCount > anchorCount) unanchored.push(`${name} ${anchorCount}/${tableCount}`);

    for (const t of parseAnchoredTables(md)) {
      if (t.anchor.role !== "register") continue;
      const rows = t.rows.filter((r) => Object.values(r).some((v) => v.trim() !== ""));
      if (rows.length) seeded.push(`${name} ${t.anchor.name}=${rows.length}`);
    }
  }

  assert.deepEqual(unanchored, [], `unanchored tables: ${unanchored.join(" · ")}`);
  assert.deepEqual(seeded, [], `register tables shipping rows: ${seeded.join(" · ")}`);
});
