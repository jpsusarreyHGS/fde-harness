/**
 * Item 7 of the SIM-01 brief: "proposals" meant nothing to a first-time user.
 *
 * The CLI verb and the folder keep their names — both are cited everywhere.
 * What changes is the first thing a reader meets: in every user-facing file,
 * the first line that says "proposal" must say "accept" in the same breath.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");

const USER_FACING = [
  "README.md",
  "CLAUDE.md",
  ".claude/commands/capture.md",
  ".claude/commands/next.md",
  ".claude/commands/discover.md",
  ".claude/agents/engagement/discovery-analyst.md",
];

test("the first mention of a proposal, in every user-facing file, says accept in the same line", async () => {
  for (const rel of USER_FACING) {
    const md = await readFile(join(HARNESS, ...rel.split("/")), "utf8");
    // Commands and fences are not prose; a table row is.
    const first = md.split(/\r?\n/).find((l) => /\bproposals?\b/i.test(l) && !/^\s*(node |```)/.test(l));
    if (!first) continue; // the file never uses the word — fine
    assert.match(first, /accept/i, `${rel}: first mention of "proposal" does not say accept:\n  ${first.trim()}`);
  }
});

test("the report header and the proposal file lead with what to do, not with the noun", async () => {
  const agent = await readFile(join(HARNESS, ".claude", "agents", "engagement", "discovery-analyst.md"), "utf8");
  assert.match(agent, /ROWS PROPOSED — review, fix any cell, then accept — <source> \(<evidence class>\)/);
  const { writeProposal } = await import("../src/proposals.ts");
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const tmp = await mkdtemp(join(tmpdir(), "fde-wording-"));
  try {
    const name = await writeProposal({
      engagementDir: tmp, source: "x.md", agent: "t",
      blocks: [{ instrument: "02-Workflow/observation-log.md", anchor: "observation-log.rows", columns: ["Id", "Time"], rows: [{ Time: "1" }] }],
    });
    const md = await readFile(join(tmp, "02-Workflow", "proposals", name), "utf8");
    assert.match(md, /^# Proposed rows — x\.md/m);
    assert.match(md, /1 row\(s\) proposed — review, fix any cell, then accept\./);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
