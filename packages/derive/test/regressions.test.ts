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

test("REGRESSION: the id alternation is built once and escapes correctly", async () => {
  // Adding `WR` meant replacing six hand-typed `EV|EX|REQ|…` alternations with
  // one generated pattern. Building a regex from a template literal is where
  // `\d` quietly becomes `d`, and the first attempt did exactly that: every
  // citation then read as an option list and `filled()` voided it.
  const { ID_PREFIXES, ID_ALTERNATION, idPattern } = await import("../src/ids.ts");

  assert.ok(ID_PREFIXES.includes("WR"), "WR joins the minted prefixes");
  assert.equal(ID_ALTERNATION, ID_PREFIXES.join("|"));
  assert.deepEqual(
    "cites EV-001, WR-02 and CQ-9".match(idPattern()),
    ["EV-001", "WR-02", "CQ-9"],
  );
  // `\b` must survive: CQ-01 is one id, not a Q- hiding inside a C.
  assert.deepEqual("CQ-01".match(idPattern()), ["CQ-01"]);

  // And the two call sites that build their own pattern from the alternation.
  assert.equal(filled("EV-001 / EV-002 / EV-003"), true);
  assert.equal(filled("EV- / EX-"), false, "bare prefixes are still placeholder text");
});

test("REGRESSION: no source file hand-types the id alternation", async () => {
  // The fix that introduced `ID_PREFIXES` replaced six hand-typed alternations
  // — except three of the replacements silently failed, and the commit claimed
  // otherwise. Asserting that `idPattern()` *works* was not enough; nothing
  // asserted the call sites used it, so `chain.ts` kept a list missing `WR-`
  // and the audit could not see a dangling write citation.
  const { readdir, readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const src = join(import.meta.dirname, "..", "src");
  const offenders: string[] = [];
  for (const f of await readdir(src)) {
    if (!f.endsWith(".ts")) continue;
    // `ids.ts` is where the list legitimately lives.
    if (f === "ids.ts") continue;
    const body = await readFile(join(src, f), "utf8");
    body.split("\n").forEach((line, i) => {
      if (/EV\|EX\|REQ/.test(line)) offenders.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, [], "build the pattern from ID_PREFIXES instead");
});

test("the four tells are counted, because the template says they are", async () => {
  // `observation-log.md.template` has always said "Derived from the Tell
  // column above — do not maintain by hand. Counts are computed at derive
  // time." Nothing computed them, so an FDE following the instruction
  // produced no count at all, and the map's Tier-1 "behavioural tell logger"
  // existed in name only.
  const { deriveChain } = await import("../src/chain.ts");
  const { parseAnchoredTables } = await import("../src/anchors.ts");

  const md = parseAnchoredTables(`
<!-- table:observation-log.rows role=register id=Id -->

| Id | Action | Tell | Class |
|---|---|---|---|
| EV-001 | pasted the reference into the portal | paste | observed |
| EV-002 | switched to the spreadsheet | switch | observed |
| EV-003 | re-keyed the same address | repeat | observed |
| EV-004 | waited for approval | dead | observed |
| EV-005 | pasted while waiting | paste · dead | observed |
| EV-006 | read the case | | observed |

<!-- table:observation-log.sessions role=register id=Date -->

| Date | Workflow observed | Ev range |
|---|---|---|
| 2026-09-09 | Claims triage | EV-001–EV-006 |
`);

  const chain = deriveChain({ tables: new Map([["observation-log", md]]) });
  assert.deepEqual(chain.tells, {
    // A row naming two tells counts once for each — pasting while waiting is
    // genuinely both — but once toward the total, because it is one event.
    repeat: 1, paste: 2, switch: 1, dead: 2, total: 5,
    // The observation window. A count without one is not evidence.
    sessions: 1,
  });
});

test("clustered vs scattered is counted, not typed", async () => {
  // The practice's own rule: "92% clustered on one exception type is a fixable
  // gap; 92% scattered randomly is a capability ceiling. They look identical
  // in a summary metric and demand opposite decisions." The ledger asked an
  // operator to type which one it was — and the optimistic reading is the one
  // people type.
  const { deriveChain } = await import("../src/chain.ts");
  const { parseAnchoredTables } = await import("../src/anchors.ts");

  const ledger = (rows: string) => new Map([["autonomy-ledger", parseAnchoredTables(`
<!-- table:autonomy-ledger.by-exception role=register id=Ex id -->

| Ex id | Run date | Workflow | Cases seen | Disagreements | Rate | Fixable by a rule? | Rule holder |
|---|---|---|---|---|---|---|---|
${rows}
`)]]);

  const clustered = deriveChain({
    tables: ledger(`| EX-001 | 2026-09-01 | Triage | 210 | 18 | 8.6% | yes | Ana |
| EX-004 | 2026-09-01 | Triage | 210 | 2 | 1.0% | yes | Ana |`),
  });
  assert.equal(clustered.shadow.pattern, "clustered");
  assert.equal(clustered.shadow.concentration, 90);
  assert.equal(clustered.shadow.disagreements, 20);

  const scattered = deriveChain({
    tables: ledger(`| EX-001 | 2026-09-01 | Triage | 210 | 5 | 2.4% | no | — |
| EX-002 | 2026-09-01 | Triage | 210 | 5 | 2.4% | no | — |
| EX-003 | 2026-09-01 | Triage | 210 | 5 | 2.4% | yes | Ana |`),
  });
  assert.equal(scattered.shadow.pattern, "scattered");
  assert.equal(scattered.shadow.classes, 3);
  // The two nobody can state a rule for are the real ceiling.
  assert.equal(scattered.shadow.unfixable, 2);

  // Nothing recorded is "unmeasured", never a flattering default.
  const empty = deriveChain({ tables: new Map() });
  assert.equal(empty.shadow.pattern, "unmeasured");
  assert.equal(empty.shadow.concentration, 0);
});
