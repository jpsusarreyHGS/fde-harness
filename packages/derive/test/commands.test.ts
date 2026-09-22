/**
 * `/commands`: every slash command, in stage order, generated from the
 * command files — and, with an engagement, where you are and what to run next.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { COMMAND_ORDER, formatCommands, groupCommands, readCommands, suggestNext } from "../src/commands.ts";
import { scaffoldEngagement } from "../src/scaffold.ts";
import { deriveState } from "../src/state.ts";

const run = promisify(execFile);
const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const CLI = join(HARNESS, "packages", "derive", "src", "cli.ts");

test("every command file has a place in the stage order, and every placed command has a file", async () => {
  const cmds = await readCommands(HARNESS);
  const { unplaced } = groupCommands(cmds);
  assert.deepEqual(unplaced, [], "add these to COMMAND_ORDER in commands.ts");
  const files = new Set(cmds.map((c) => c.name));
  for (const g of COMMAND_ORDER) for (const c of g.commands) assert.ok(files.has(c), `COMMAND_ORDER names /${c} but .claude/commands/${c}.md does not exist`);
  for (const c of cmds) assert.ok(c.description.length > 20, `/${c.name} has no description in its frontmatter`);
});

test("the listing is generated from the files, in stage order, with the stage badge stripped from the line", async () => {
  const text = formatCommands(await readCommands(HARNESS));
  const lines = text.split("\n");
  const at = (name: string) => lines.findIndex((l) => l.startsWith(`  /${name} `));
  assert.ok(at("init-engagement") < at("capture"), "00 before discovery");
  assert.ok(at("capture") < at("gate"));
  assert.ok(at("gate") < at("allocate"));
  assert.ok(at("allocate") < at("evaluate"));
  assert.ok(at("evaluate") < at("roi"));
  assert.ok(at("roi") < at("harness-improver"));
  assert.match(lines[at("capture")]!, /^ {2}\/capture\s+Turn raw material into proposed instrument rows\./);
  assert.match(text, /01–03 · Discovery/);
  assert.match(text, /CLI verbs behind the commands/);
});

test("with a day-one engagement it says so and points at evidence/, then /chronicle", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "fde-cmds-"));
  try {
    await scaffoldEngagement({
      engagementsRoot: join(tmp, "engagements"),
      templatesDir: join(HARNESS, ".claude", "templates", "engagement-init"),
      vars: { CLIENT_NAME: "X", SLUG: "x-co", SPONSOR: "S", SCOPE: "s", NON_GOALS: "n", RESIDENCY: "client-tenant", LABOUR: "none", DATE: "2026-09-09" },
    });
    const dir = join(tmp, "engagements", "x-co");
    const state = await deriveState({ engagementDir: dir, slug: "x-co", harnessRoot: HARNESS, deliverablesDir: join(tmp, "deliverables") });
    const { where, next } = suggestNext(state);
    assert.match(where, /^Day one/);
    assert.match(next[0]!.command, /evidence-handling-terms/, "terms first — capture is hard-stopped without them");
    assert.ok(next.some((n) => /go and watch/.test(n.command)));
    assert.equal(next.at(-1)!.command, "/chronicle");
    for (const n of next) assert.ok(n.why.length > 10, `${n.command} has no reason`);

    const { stdout } = await run(process.execPath, [CLI, "commands", dir]);
    assert.match(stdout, /^WHERE YOU ARE — x-co/);
    assert.match(stdout, /NEXT, IN ORDER/);
    assert.match(stdout, /\/capture\s+Turn raw material/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("without an engagement it lists commands and exits 0", async () => {
  const { stdout } = await run(process.execPath, [CLI, "commands"]);
  assert.match(stdout, /^COMMANDS — in stage order/);
  assert.ok(!/WHERE YOU ARE/.test(stdout));
});

test("material waiting outranks everything else in the suggestion", async () => {
  const cmds = await readCommands(HARNESS);
  assert.ok(cmds.some((c) => c.name === "commands"));
  const tmp = await mkdtemp(join(tmpdir(), "fde-cmds2-"));
  try {
    await scaffoldEngagement({
      engagementsRoot: join(tmp, "engagements"),
      templatesDir: join(HARNESS, ".claude", "templates", "engagement-init"),
      vars: { CLIENT_NAME: "X", SLUG: "x-co", SPONSOR: "S", SCOPE: "s", NON_GOALS: "n", RESIDENCY: "client-tenant", LABOUR: "none", DATE: "2026-09-09" },
    });
    const dir = join(tmp, "engagements", "x-co");
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(join(dir, "02-Workflow", "evidence", "stated"), { recursive: true });
    await writeFile(join(dir, "02-Workflow", "evidence", "stated", "call.md"), "notes\n", "utf8");
    const state = await deriveState({ engagementDir: dir, slug: "x-co", harnessRoot: HARNESS, deliverablesDir: join(tmp, "deliverables") });
    const { next } = suggestNext(state);
    assert.equal(next[0]!.command, "/capture");
    assert.match(next[0]!.why, /1 file\(s\) in evidence\//);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
