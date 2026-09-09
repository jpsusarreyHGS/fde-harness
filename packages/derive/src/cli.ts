#!/usr/bin/env node
/**
 * Derive, audit, and drive the intake loop.
 *
 *   cli.ts <engagement-dir>                     print state.json
 *   cli.ts <engagement-dir> --out state.json    write it
 *   cli.ts <engagement-dir> --audit             chain findings, gating exit
 *   cli.ts intake  <engagement-dir>             what is waiting, and its class
 *   cli.ts pending <engagement-dir>             proposals awaiting a decision
 *   cli.ts accept  <engagement-dir> <proposal>  mint ids and write the rows
 *   cli.ts mint    <engagement-dir> <PREFIX> [n]  next ids, without writing
 *
 * Exit codes are meant for a runner and for CI:
 *   0  fine
 *   1  --audit found a blocking defect, or an accept was refused
 *   2  bad invocation
 *   3  the engagement files claim something untrue (tampered)
 */

import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { deriveState } from "./state.ts";
import { tampered, validateState } from "./validate.ts";
import { mintIds, type IdPrefix } from "./ids.ts";
import { scanIntake, CLASS_MEANING } from "./intake.ts";
import { acceptProposal, pendingProposals } from "./proposals.ts";
import { WriteRefused } from "./writer.ts";

const argv = process.argv.slice(2);
const SUBCOMMANDS = new Set(["intake", "pending", "accept", "mint"]);
const sub = argv[0] && SUBCOMMANDS.has(argv[0]) ? argv[0] : null;
const args = sub ? argv.slice(1) : argv;

const dirArg = args.find((a) => !a.startsWith("--"));
if (!dirArg) {
  console.error("usage: cli.ts [intake|pending|accept|mint] <engagement-dir> [...]");
  process.exit(2);
}
const engagementDir = resolve(dirArg);
const harnessRoot = resolve(engagementDir, "..", "..");

// --------------------------------------------------------------- subcommands

if (sub === "intake") {
  const { items, unclassified } = await scanIntake(engagementDir);
  if (!items.length && !unclassified.length) {
    console.log("Nothing in 02-Workflow/evidence/.");
    console.log("");
    console.log("Drop material into the folder that says what it is:");
    for (const [cls, meaning] of Object.entries(CLASS_MEANING)) {
      console.log(`  evidence/${cls.padEnd(11)} ${meaning}`);
    }
    process.exit(0);
  }
  for (const i of items) {
    const flag =
      i.handling === "needs-service" ? "  NEEDS TRANSCRIPTION/DESCRIPTION"
      : i.handling === "unsupported" ? "  UNSUPPORTED FORMAT"
      : i.handling === "convert" && !i.converted ? "  needs conversion"
      : "";
    console.log(`${i.evidenceClass.padEnd(11)} ${i.file}${flag}`);
  }
  if (unclassified.length) {
    console.log("");
    console.log("Outside a class folder — move these; the class is never guessed:");
    for (const u of unclassified) console.log(`  ${u}`);
    process.exit(1);
  }
  process.exit(0);
}

if (sub === "pending") {
  const p = await pendingProposals(engagementDir);
  if (!p.length) {
    console.log("No proposals awaiting a decision.");
    process.exit(0);
  }
  for (const f of p) console.log(f);
  process.exit(0);
}

if (sub === "accept") {
  const name = args.filter((a) => !a.startsWith("--"))[1];
  if (!name) {
    console.error("usage: cli.ts accept <engagement-dir> <proposal.md>");
    process.exit(2);
  }
  try {
    const res = await acceptProposal(engagementDir, name);
    if (res.danglingCitations.length) {
      console.error("Refused — the proposal cites ids that do not exist:");
      for (const d of res.danglingCitations) {
        console.error(`  ${d.anchor} row ${d.row}: ${d.cited}`);
      }
      console.error("");
      console.error("Nothing was written. Fix the citations, or delete those rows.");
      process.exit(1);
    }
    for (const w of res.written) {
      const range = w.ids.length ? ` (${w.ids[0]}\u2013${w.ids.at(-1)})` : "";
      console.log(`${w.anchor}: ${w.rows} row(s)${range}`);
    }
    console.log(`\n${res.totalRows} row(s) written. Run --audit to see what they need.`);
    process.exit(0);
  } catch (err) {
    if (err instanceof WriteRefused) {
      console.error(`Refused: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

if (sub === "mint") {
  const rest = args.filter((a) => !a.startsWith("--"));
  const prefix = rest[1] as IdPrefix | undefined;
  const n = Number(rest[2] ?? "1");
  if (!prefix) {
    console.error("usage: cli.ts mint <engagement-dir> <EV|EX|REQ|AL|CQ|Q> [count]");
    process.exit(2);
  }
  const { ids, previousMax } = await mintIds(engagementDir, prefix, Number.isFinite(n) ? n : 1);
  console.error(`(highest existing: ${prefix}-${previousMax})`);
  for (const id of ids) console.log(id);
  process.exit(0);
}

// ------------------------------------------------------------------- derive

const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : undefined;

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
