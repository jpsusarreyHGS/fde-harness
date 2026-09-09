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
 *   cli.ts anchors <engagement-dir> [filter]    register tables and their columns
 *   cli.ts propose <engagement-dir> <spec.json> validate and write a proposal
 *   cli.ts reject  <engagement-dir> <proposal> <reason>  decline it
 *   cli.ts next    <engagement-dir> [n]         the ranked question queue
 *
 * Exit codes are meant for a runner and for CI:
 *   0  fine
 *   1  --audit found a blocking defect, or an accept was refused
 *   2  bad invocation
 *   3  the engagement files claim something untrue (tampered)
 */

import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { deriveState } from "./state.ts";
import { tampered, validateState } from "./validate.ts";
import { mintIds, type IdPrefix } from "./ids.ts";
import { scanIntake, CLASS_MEANING } from "./intake.ts";
import {
  acceptProposal,
  pendingProposals,
  proposeFromSpec,
  rejectProposal,
  type ProposalSpec,
} from "./proposals.ts";
import { INSTRUMENTS } from "./instruments.ts";
import { dataRows, parseAnchoredTables } from "./anchors.ts";
import { deskWork, nextConversations } from "./coach.ts";
import { WriteRefused } from "./writer.ts";

const argv = process.argv.slice(2);
const SUBCOMMANDS = new Set([
  "intake", "pending", "accept", "reject", "mint", "anchors", "propose", "next",
]);
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

if (sub === "anchors") {
  // An agent building a proposal needs the real column names. Making it grep
  // HTML comments out of 41 instruments is how a typo silently drops a cell.
  const filter = args.filter((a) => !a.startsWith("--"))[1]?.toLowerCase();
  let shown = 0;
  for (const inst of INSTRUMENTS) {
    let md: string;
    try {
      md = await readFile(resolve(engagementDir, ...inst.path.split("/")), "utf8");
    } catch {
      continue;
    }
    for (const t of parseAnchoredTables(md)) {
      if (t.anchor.role !== "register") continue;
      if (filter && !t.anchor.name.toLowerCase().includes(filter) &&
          !inst.path.toLowerCase().includes(filter)) continue;
      console.log(t.anchor.name);
      console.log(`  ${inst.path}`);
      console.log(`  ${t.headers.join(" | ")}`);
      // Only a prefixed key column is minted. `observation-log.sessions` keys
      // on Date, which the FDE supplies — saying "leave it blank" there would
      // be a lie the agent would obey.
      if (t.anchor.idColumn) {
        const minted = /^(EV|EX|REQ|AL|CQ|Q)-/.test(
          dataRows(t)[0]?.[t.anchor.idColumn]?.replace(/~~/g, "") ?? "",
        );
        console.log(
          minted
            ? `  idColumn=${t.anchor.idColumn} — leave it blank; code mints it at accept`
            : `  key column=${t.anchor.idColumn} — you supply it`,
        );
      }
      console.log("");
      shown++;
    }
  }
  if (!shown) {
    console.error(filter ? `No register table matches "${filter}".` : "No register tables found.");
    process.exit(1);
  }
  process.exit(0);
}

if (sub === "propose") {
  const specPath = args.filter((a) => !a.startsWith("--"))[1];
  if (!specPath) {
    console.error("usage: cli.ts propose <engagement-dir> <spec.json>");
    console.error("");
    console.error('spec: { "source": "...", "agent": "...", "blocks": [');
    console.error('  { "instrument": "02-Workflow/observation-log.md",');
    console.error('    "anchor": "observation-log.rows", "prefix": "EV", "idColumn": "Id",');
    console.error('    "columns": [...], "rows": [ { "Column": "value" } ] } ] }');
    console.error("");
    console.error("Run `anchors` first for the real column names.");
    process.exit(2);
  }
  let spec: ProposalSpec;
  try {
    spec = JSON.parse(await readFile(resolve(specPath), "utf8")) as ProposalSpec;
  } catch (err) {
    console.error(`Cannot read spec: ${(err as Error).message}`);
    process.exit(2);
  }
  try {
    const { name, rows } = await proposeFromSpec(engagementDir, spec);
    console.log(name);
    console.error(`${rows} row(s) proposed. Nothing written to a register yet.`);
    console.error(`Accept with: cli.ts accept ${dirArg} ${name}`);
    process.exit(0);
  } catch (err) {
    if (err instanceof WriteRefused) {
      console.error(`Refused: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

if (sub === "reject") {
  const rest = args.filter((a) => !a.startsWith("--"));
  const name = rest[1];
  const reason = rest.slice(2).join(" ");
  if (!name || !reason) {
    console.error("usage: cli.ts reject <engagement-dir> <proposal.md> <reason>");
    process.exit(2);
  }
  try {
    await rejectProposal(engagementDir, name, reason);
    console.log(`${name} declined: ${reason}`);
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

if (sub === "next") {
  const n = Number(args.filter((a) => !a.startsWith("--"))[1] ?? "3");
  const groups = nextConversations(state.coach, Number.isFinite(n) ? n : 3);
  if (!groups.length) {
    console.log("Nothing to ask. Every gate criterion is met and the chain is intact.");
    process.exit(0);
  }
  for (const g of groups) {
    console.log(`
${g.whoName ? `${g.whoName} — ${g.who}` : `${g.who} (no name in the stakeholder map)`}`);
    for (const q of g.questions.slice(0, 4)) {
      console.log(`  · ${q.ask}`);
      console.log(`      why: ${q.why}`);
      if (q.blocks) console.log(`      blocks: ${q.blocks}`);
      console.log(`      write it to: ${q.location}`);
    }
    if (g.questions.length > 4) {
      console.log(`  … and ${g.questions.length - 4} more for the same conversation`);
    }
  }
  const desk = deskWork(state.coach);
  if (desk.length) {
    console.log("\nYours to fix — no conversation will resolve these");
    for (const q of desk.slice(0, 5)) {
      console.log(`  · ${q.ask}`);
      console.log(`      ${q.location}`);
    }
    if (desk.length > 5) console.log(`  … and ${desk.length - 5} more`);
  }

  console.log("");
  console.log(
    `${state.coach.length} item(s) in the queue: ${state.coach.length - desk.length} to ask, ` +
      `${desk.length} to fix. Answers go into the instrument, not into chat — ` +
      "that is what makes them count.",
  );
  process.exit(0);
}

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
