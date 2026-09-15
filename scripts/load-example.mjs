#!/usr/bin/env node
/**
 * Load an example engagement.
 *
 *   node scripts/load-example.mjs <slug> [--force]
 *
 * Scaffolds `engagements/<slug>/` from the example's `vars.json` and copies
 * its evidence into the class folders, so you start where a real engagement
 * starts — with notes and a transcript and an export, not with filled-in
 * instruments.
 *
 * Refuses to overwrite an engagement that already exists. `--force` is for a
 * fixture you have already worked and want to reset; it deletes the whole
 * engagement directory, so it asks you to be explicit about which one.
 */

import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { initEngagement, validateVars } from "../packages/derive/src/init.ts";

const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES = join(HARNESS, "examples");

const slug = process.argv[2];
const force = process.argv.includes("--force");

const available = (await readdir(EXAMPLES, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

if (!slug || !available.includes(slug)) {
  console.error("usage: node scripts/load-example.mjs <slug> [--force]\n");
  console.error("Available:");
  for (const a of available) {
    const vars = JSON.parse(await readFile(join(EXAMPLES, a, "vars.json"), "utf8"));
    console.error(`  ${a.padEnd(22)} ${vars.SCOPE}`);
  }
  process.exit(2);
}

const src = join(EXAMPLES, slug);
const dst = join(HARNESS, "engagements", slug);

if (await stat(dst).catch(() => null)) {
  if (!force) {
    console.error(`engagements/${slug} already exists.`);
    console.error("Re-run with --force to delete and reload it, or pick another slug.");
    process.exit(1);
  }
  await rm(dst, { recursive: true, force: true });
  await rm(join(HARNESS, "deliverables", slug), { recursive: true, force: true });
  console.log(`Removed the previous engagements/${slug}.`);
}

const vars = validateVars(JSON.parse(await readFile(join(src, "vars.json"), "utf8")), slug);
const res = await initEngagement({ engagementDir: dst, harnessRoot: HARNESS, vars });

console.log(`${slug} — ${res.created.length} file(s), ${res.directories} directories`);
if (res.questionsRaised.length) {
  console.log(`  ${res.questionsRaised.join(", ")} raised for values left as TBD`);
}

// Everything under the example root that is not vars.json is material an FDE
// would have dropped in — including anything deliberately misfiled, which the
// intake scan is supposed to catch rather than tidy away.
let copied = 0;
const walk = async (dir, rel = "") => {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (rel === "" && e.name === "vars.json") continue;
    const from = join(dir, e.name);
    const to = join(dst, "02-Workflow", rel, e.name);
    if (e.isDirectory()) {
      await mkdir(to, { recursive: true });
      await walk(from, join(rel, e.name));
    } else {
      await mkdir(dirname(to), { recursive: true });
      await cp(from, to);
      copied++;
    }
  }
};
await walk(src);

console.log(`  ${copied} evidence file(s) dropped into 02-Workflow/`);
console.log("");
console.log("Next:");
console.log(`  node packages/derive/src/cli.ts intake engagements/${slug}`);
console.log("  then /capture in Claude Code, accept the proposal, and /next");
