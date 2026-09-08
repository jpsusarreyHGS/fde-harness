#!/usr/bin/env node
/**
 * Derive an engagement's state.
 *
 *   node src/cli.ts <engagement-dir> [--out state.json] [--audit]
 *
 * Exit codes are meant for a runner and for CI:
 *   0  derived cleanly
 *   1  --audit found a blocking chain defect
 *   2  bad invocation
 *   3  the engagement files claim something untrue (tampered)
 */

import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { deriveState } from "./state.ts";
import { tampered, validateState } from "./validate.ts";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) {
  console.error("usage: cli.ts <engagement-dir> [--out <file>] [--audit]");
  process.exit(2);
}

const outIdx = args.indexOf("--out");
const out = outIdx >= 0 ? args[outIdx + 1] : undefined;
const engagementDir = resolve(dir);
const harnessRoot = resolve(engagementDir, "..", "..");

const state = await deriveState({
  engagementDir,
  slug: basename(engagementDir),
  harnessRoot,
  datasourcesDir: resolve(harnessRoot, "datasources"),
  deliverablesDir: resolve(harnessRoot, "deliverables"),
});

// Refuse to emit state derived from a file that claims something untrue —
// a gate passed with no decider, a rung asserted with no measurement.
const violations = validateState(state);
const fatal = tampered(violations);
if (fatal.length > 0) {
  for (const v of fatal) console.error(`TAMPERED  ${v.rule}  ${v.detail}`);
  console.error("");
  console.error("Refusing to emit. Fix the engagement files — state is derived, never authoritative.");
  process.exit(3);
}
for (const v of violations) console.error(`warn  ${v.rule}  ${v.detail}`);

if (args.includes("--audit")) {
  const a = state.chain.audit;
  for (const f of a.findings) {
    console.log(`${f.kind}  ${f.id}  ${f.location}  ${f.detail}`);
  }
  const blocking = a.unsourcedRequirements + a.danglingCitations;
  console.log("");
  console.log(
    `${a.findings.length} finding(s); ${blocking} blocking ` +
      "(unsourced requirements + dangling citations)",
  );
  process.exit(blocking > 0 ? 1 : 0);
}

const json = JSON.stringify(state, null, 2) + "\n";
if (out) {
  await writeFile(out, json, "utf8");
  console.log(out);
} else {
  process.stdout.write(json);
}
