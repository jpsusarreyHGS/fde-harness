/**
 * Item 4 of the SIM-01 brief: `/allocate` refused from inside a subagent
 * because the host tool had isolated it in a fresh worktree that held no
 * engagement. Host isolation cannot be unit-tested; the pre-flight that
 * catches it at the command can.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";

const run = promisify(execFile);
const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const PREFLIGHT = join(HARNESS, "scripts", "preflight.mjs");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");

let tmp: string;
let dir: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-preflight-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Solara Foods", SLUG: "solara-foods", SPONSOR: "Dana Whitfield",
      SCOPE: "Deductions", NON_GOALS: "None.", RESIDENCY: "client-tenant", LABOUR: "none",
      DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "solara-foods");
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

async function preflight(arg: string, cwd = HARNESS): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(process.execPath, [PREFLIGHT, arg], { cwd });
    return { code: 0, stdout, stderr };
  } catch (e) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

test("an engagement that is not there exits 1 with the message and the fix", async () => {
  const r = await preflight("engagements/no-such-client");
  assert.equal(r.code, 1);
  assert.match(r.stderr, /^engagements\/no-such-client is not visible from this session\./);
  assert.match(r.stderr, /isolated worktree/);
  assert.match(r.stderr, /git worktree list/);
  assert.match(r.stderr, /Fix that first; do not dispatch\./);
  assert.match(r.stderr, /\/init-engagement/);
});

test("a bare slug is resolved under engagements/ from the cwd", async () => {
  const r = await preflight("solara-foods", tmp);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^preflight ok — engagements\/solara-foods is visible from /);
});

test("a path to a visible engagement exits 0", async () => {
  const r = await preflight(dir);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /preflight ok/);
});

test("MEMORY.md alone is enough to proceed, with a note about state.json", async () => {
  await unlink(join(dir, "state.json")).catch(() => {});
  const r = await preflight(dir);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /note: state\.json is missing — run \/init-engagement/);
});

test("no argument is a usage error, not a pass", async () => {
  let code = 0;
  try { await run(process.execPath, [PREFLIGHT], { cwd: HARNESS }); } catch (e) { code = (e as { code: number }).code; }
  assert.equal(code, 2);
});
