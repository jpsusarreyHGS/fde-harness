/**
 * Stage 00: what was agreed, and what we believed before we landed.
 *
 * The gap these instruments close is specific. Every scope decision in an
 * engagement is adjudicated against the pilot charter, and that charter's
 * scope was one line an FDE typed into a prompt from memory — with no field
 * recording where it came from or whether it matched anything the client
 * signed. The baseline the whole discipline rests on was a recollection.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { initEngagement, validateVars, InitRefused } from "../src/init.ts";
import { deriveChain } from "../src/chain.ts";
import { parseAnchoredTables, findTable } from "../src/anchors.ts";
import { mintIds, prefixMintedBy } from "../src/ids.ts";
import { scanIntake } from "../src/intake.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");

const VARS = {
  CLIENT_NAME: "Probe Co",
  SPONSOR: "VP Operations",
  SCOPE: "Inbound triage",
  NON_GOALS: "No adjudication.",
  DATE: "2026-09-16",
};

async function scaffold(extra: Record<string, unknown> = {}) {
  const tmp = await mkdtemp(join(tmpdir(), "fde-mandate-"));
  const dir = join(tmp, "engagements", "probe-co");
  await initEngagement({
    engagementDir: dir,
    harnessRoot: HARNESS,
    deliverablesRoot: join(tmp, "deliverables"),
    vars: validateVars({ ...VARS, ...extra }, "probe-co"),
  });
  return { tmp, dir };
}

test("the pre-engagement instruments scaffold, and their anchors parse", async () => {
  const { tmp, dir } = await scaffold();
  try {
    for (const [file, anchors] of [
      ["00-Setup/engagement-mandate.md",
       ["mandate.agreement", "mandate.promised", "mandate.boundary",
        "mandate.documents", "mandate.prior-work"]],
      ["00-Setup/entry-hypotheses.md",
       ["entry-hypotheses.request", "entry-hypotheses.package", "entry-hypotheses.rows"]],
    ] as const) {
      const tables = parseAnchoredTables(await readFile(join(dir, ...file.split("/")), "utf8"));
      for (const a of anchors) {
        assert.ok(findTable(tables, a), `${file} is missing ${a}`);
      }
    }
    // The agreement folder ships its own rules about what may be copied in.
    const readme = await readFile(join(dir, "00-Setup", "agreement", "README.md"), "utf8");
    assert.match(readme, /executed contract, unless legal has explicitly agreed/i);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("HY- is minted by code, from the hypotheses file", async () => {
  const { tmp, dir } = await scaffold();
  try {
    assert.equal(prefixMintedBy("00-Setup/entry-hypotheses.md", "entry-hypotheses.rows"), "HY");
    // Not the other tables in the same file.
    assert.equal(prefixMintedBy("00-Setup/entry-hypotheses.md", "entry-hypotheses.package"), null);
    const { ids } = await mintIds(dir, "HY", 3);
    assert.deepEqual(ids, ["HY-01", "HY-02", "HY-03"]);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("a scope nobody can source raises a question against the sponsor", async () => {
  // "recollection" is an honest answer and still a gap: it means the baseline
  // every scope decision is judged against cannot be checked against anything
  // the client agreed to buy.
  for (const source of [undefined, "recollection"] as const) {
    const { tmp, dir } = await scaffold(source ? { SCOPE_SOURCE: source } : {});
    try {
      const md = await readFile(join(dir, "02-Workflow", "open-questions.md"), "utf8");
      assert.match(md, /What did the client actually agree to buy/);
      assert.match(md, /Executive sponsor/);
      assert.match(md, /scope-changes\.md is adjudicated against this line/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
});

test("a sourced scope raises no question, and is recorded on the charter", async () => {
  const { tmp, dir } = await scaffold({ SCOPE_SOURCE: "mandate" });
  try {
    const q = await readFile(join(dir, "02-Workflow", "open-questions.md"), "utf8");
    assert.ok(!/actually agree to buy/.test(q), "nothing to ask — it is sourced");
    const charter = await readFile(join(dir, "00-Setup", "pilot-charter.md"), "utf8");
    assert.match(charter, /\| Scope source \| mandate \|/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("an invalid scope source is refused before it reaches an instrument", () => {
  assert.throws(
    () => validateVars({ ...VARS, SCOPE_SOURCE: "vibes" }, "probe-co"),
    (e: Error) => {
      assert.ok(e instanceof InitRefused);
      assert.match(e.message, /mandate, document, recollection, tbd/);
      return true;
    },
  );
});

test("a hypothesis left open is a finding; closed either way, it is not", () => {
  const rows = (status: string) => parseAnchoredTables(`
<!-- table:entry-hypotheses.rows role=register id=Id -->

| Id | Hypothesis | Why we believe it | Disconfirming evidence we would want | Status | Revisited |
|---|---|---|---|---|---|
| HY-01 | The bottleneck is volume | The brief says throughput | Handling time dominated by waiting | ${status} | |
`);
  const chain = (status: string) =>
    deriveChain({ tables: new Map([["entry-hypotheses", rows(status)]]) });

  const open = chain("open");
  assert.equal(open.audit.hypothesesNeverRevisited, 1);
  const f = open.audit.findings.find((x) => x.kind === "hypothesis-never-revisited")!;
  assert.equal(f.id, "HY-01");
  assert.match(f.detail, /quietly dropped is one you were wrong about/);

  // Being wrong closes it. That is the whole point of writing it down.
  for (const closed of ["supported", "disproved"]) {
    assert.equal(chain(closed).audit.hypothesesNeverRevisited, 0, closed);
  }
});

test("an open hypothesis is desk work — nobody at the client can close it", async () => {
  const { coach, deskWork } = await import("../src/coach.ts");
  const findings = [{
    kind: "hypothesis-never-revisited" as const,
    id: "HY-02",
    location: "00-Setup/entry-hypotheses.md",
    detail: "still open.",
  }];
  const qs = coach({ findings, gates: [], tables: [] });
  const q = qs.find((x) => x.id === "HY-02")!;
  assert.equal(q.work, "fix");
  assert.equal(q.who, "FDE");
  assert.match(q.ask, /Did discovery support it or disprove it\?/);
  assert.ok(deskWork(qs).some((x) => x.id === "HY-02"));
});

test("the agreement folder is not evidence and is never classified", async () => {
  const { tmp, dir } = await scaffold();
  try {
    await writeFile(join(dir, "00-Setup", "agreement", "proposal.md"), "the SOW as sent\n", "utf8");
    const { items, unclassified } = await scanIntake(dir);
    assert.deepEqual(items, [], "commercial paper is not field evidence");
    assert.deepEqual(unclassified, [], "and it is not a misfiling to report either");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
