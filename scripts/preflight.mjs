#!/usr/bin/env node
/**
 * Pre-flight before dispatching an agent.
 *
 *   node scripts/preflight.mjs engagements/<slug>
 *   node scripts/preflight.mjs <slug>
 *
 * Every command that dispatches a subagent runs this first. It answers one
 * question — **can the engagement be seen from here?** — and says so plainly
 * before an agent has to discover it three steps in.
 *
 * Why this exists: engagement folders are client data and are gitignored on
 * purpose, so they exist only in the checkout where they were created. A
 * host tool that isolates a subagent in a fresh git worktree hands it a copy
 * of the repo at `origin/main` — which contains no engagements at all. In the
 * first field simulation `/allocate` failed inside the agent with a confusing
 * refusal, and the trainee skipped stage 04 entirely. That failure belongs at
 * the command, in one sentence, with the fix.
 *
 * Exit codes:
 *   0  the engagement is visible; go ahead
 *   1  it is not; the message says why and what to do. Do not dispatch.
 *   2  bad invocation
 */

import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/preflight.mjs engagements/<slug>");
  process.exit(2);
}

// Accept a slug, a relative engagement path, or an absolute one.
const engagementDir = /[\\/]/.test(arg) ? resolve(arg) : resolve(process.cwd(), "engagements", arg);
const slug = basename(engagementDir);
const shown = `engagements/${slug}`;

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

async function readable(p) {
  try {
    const s = await stat(p);
    if (!s.isFile()) return false;
    await readFile(p, "utf8");
    return true;
  } catch {
    return false;
  }
}

// What kind of checkout is this? A worktree has a `.git` file pointing at the
// main repository's `.git/worktrees/<name>`, so its git-dir and its common
// git-dir differ. That is the isolation signature.
const gitDir = git("rev-parse", "--git-dir");
const commonDir = git("rev-parse", "--git-common-dir");
const top = git("rev-parse", "--show-toplevel");
const inWorktree = !!gitDir && !!commonDir && resolve(process.cwd(), gitDir) !== resolve(process.cwd(), commonDir);

const stateOk = await readable(join(engagementDir, "state.json"));
const memoryOk = await readable(join(engagementDir, "chronicle", "memory", "MEMORY.md"));

if (stateOk || memoryOk) {
  const notes = [];
  if (!stateOk) notes.push("state.json is missing — run /init-engagement to bring it forward; MEMORY.md was enough to proceed");
  if (top && resolve(top) !== HARNESS) notes.push(`this checkout (${top}) is not the harness this script lives in (${HARNESS})`);
  console.log(`preflight ok — ${shown} is visible from ${process.cwd()}${inWorktree ? " (a git worktree, but the engagement is here)" : ""}`);
  for (const n of notes) console.log(`  note: ${n}`);
  process.exit(0);
}

console.error(`${shown} is not visible from this session.`);
console.error("");
if (inWorktree) {
  console.error(`This session is running in an isolated git worktree (${top}).`);
  console.error("Engagement folders are gitignored — they are client data — so a worktree");
  console.error("checked out from origin/main contains none of them. Run agent commands from");
  console.error("the main checkout, or turn off worktree isolation in your host tool.");
} else {
  console.error("Either this session is running in an isolated worktree (check `git worktree list`");
  console.error("and your host tool's isolation setting) or the engagement has not been created");
  console.error("here. Engagement folders are gitignored, so they exist only where they were made.");
}
console.error("");
console.error("Fix that first; do not dispatch.");
console.error(`  looked for: ${join(engagementDir, "state.json")}`);
console.error(`  and:        ${join(engagementDir, "chronicle", "memory", "MEMORY.md")}`);
console.error(`  cwd:        ${process.cwd()}`);
if (top) console.error(`  checkout:   ${top}${inWorktree ? "  (worktree)" : ""}`);
console.error("");
console.error("If the engagement genuinely does not exist yet: /init-engagement.");
process.exit(1);
