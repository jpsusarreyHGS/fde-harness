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
 *   cli.ts scaffold <engagement-dir> --json vars.json [--dry-run]
 *                                              create it, or bring it forward
 *   cli.ts contract-check <engagement-dir>      will the ontology compiler take it?
 *   cli.ts roi     <engagement-dir>             the four outputs, with the working
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
import { ID_ALTERNATION, mintIds, prefixMintedBy, type IdPrefix } from "./ids.ts";
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
import { initEngagement, InitRefused, validateVars } from "./init.ts";
import { checkContract, readContract } from "./contract.ts";
import { WriteRefused } from "./writer.ts";

const argv = process.argv.slice(2);
const SUBCOMMANDS = new Set([
  "intake", "pending", "accept", "reject", "mint", "anchors", "propose", "next",
  "scaffold", "contract-check", "roi",
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

if (sub === "scaffold") {
  const jsonAt = args.indexOf("--json");
  const specPath = jsonAt >= 0 ? args[jsonAt + 1] : undefined;
  if (!specPath) {
    console.error("usage: cli.ts scaffold <engagement-dir> --json vars.json [--dry-run]");
    console.error("");
    console.error("vars: { \"CLIENT_NAME\": \"...\", \"SPONSOR\": \"...\",");
    console.error("        \"SCOPE\": \"...\", \"NON_GOALS\": \"...\",");
    console.error("        \"SYSTEMS\"?, \"ONTOLOGY_REPO\"?,");
    console.error("        \"RESIDENCY\"? client-tenant|hgs-tenant|tbd,");
    console.error("        \"LABOUR\"? works-council|union|none|unknown }");
    console.error("");
    console.error("SLUG comes from the directory name. Safe to re-run: existing");
    console.error("files are never overwritten, so this also brings an old");
    console.error("engagement forward onto new templates.");
    process.exit(2);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(resolve(specPath), "utf8"));
  } catch (err) {
    console.error(`Cannot read vars: ${(err as Error).message}`);
    process.exit(2);
  }
  try {
    const vars = validateVars(raw, basename(engagementDir));
    const res = await initEngagement({
      engagementDir,
      harnessRoot,
      vars,
      dryRun: args.includes("--dry-run"),
    });

    if (args.includes("--dry-run")) {
      console.log(`${res.slug} — dry run (${res.backfill ? "backfill" : "new"})`);
      for (const f of res.backfilled) console.log(`  would create  ${f}`);
      if (!res.backfilled.length) console.log("  nothing to create — already complete");
    } else {
      console.log(`${res.slug} — ${res.backfill ? "brought forward" : "created"}`);
      console.log(`  ${res.directories} directories`);
      console.log(`  ${res.created.length} file(s) written, ${res.skipped.length} already present`);
      if (res.questionsRaised.length) {
        console.log(`  ${res.questionsRaised.join(", ")} raised for values left as TBD`);
      }
      console.log("  state.json derived");
    }

    if (res.survivingPlaceholders.length) {
      console.error("");
      console.error("Unresolved placeholders still on disk:");
      for (const s of res.survivingPlaceholders) {
        console.error(`  ${s.file}: ${s.keys.map((k) => `{{${k}}}`).join(" ")}`);
      }
      console.error("");
      console.error("Each one is a value nobody has supplied. Fill it or raise a Q-.");
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    if (err instanceof InitRefused) {
      console.error(`Refused: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}

if (sub === "contract-check") {
  // The ontology compiler refuses on these, at its own boundary, in Python.
  // Running them here means the FDE hears it in the harness's words, on the
  // day the gap was created, with a person to ask.
  const findings = checkContract(await readContract(engagementDir));
  const refusals = findings.filter((f) => f.severity === "refuse");
  const warnings = findings.filter((f) => f.severity === "warn");

  if (refusals.length) {
    console.log("Refused — the ontology compiler will not build past these:\n");
    for (const f of refusals) {
      console.log(`  ${f.where}`);
      console.log(`    ${f.detail}`);
      if (f.who) console.log(`    ask: ${f.who}`);
      if (f.location) console.log(`    in:  ${f.location}`);
      console.log("");
    }
  }

  if (warnings.length) {
    console.log(`${refusals.length ? "Also thin" : "Thin, but it will build"} — ${warnings.length} warning(s):\n`);
    for (const f of warnings.slice(0, 12)) {
      console.log(`  ${f.where} — ${f.detail}`);
    }
    if (warnings.length > 12) console.log(`  … and ${warnings.length - 12} more`);
    console.log("");
  }

  if (!findings.length) {
    console.log("The contract holds. Hand it over with:");
    console.log("");
    console.log(`  python -m core.importer ${dirArg}/03-Systems/ontology --instance ${basename(engagementDir)}`);
    process.exit(0);
  }

  console.log(
    `${refusals.length} refusal(s), ${warnings.length} warning(s). ` +
      "Thinness is visible progress; a missing owner is an unanswered question about who decides.",
  );
  process.exit(refusals.length ? 1 : 0);
}

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
      //
      // Taken from the prefix registry, not from an existing row: a fresh
      // engagement has no rows, and reading the first one made every register
      // look FDE-supplied on exactly the day that matters.
      if (t.anchor.idColumn) {
        // Ask by anchor. Only one table per file mints, and it is not always
        // the primary one — `exception-register.promoted` records what EX-004
        // became without creating EX-005, and `personas.rows` keys on a role.
        const prefix = prefixMintedBy(inst.path, t.anchor.name);
        const minted = prefix !== null;
        console.log(
          minted
            ? `  idColumn=${t.anchor.idColumn} — leave it blank; code mints ${prefix}- at accept`
            : `  key column=${t.anchor.idColumn} — you supply it (an existing id, or a value)`,
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
    console.error(`usage: cli.ts mint <engagement-dir> <${ID_ALTERNATION}> [count]`);
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

if (sub === "roi") {
  const r = state.roi;
  const fmt = (n: number | null, suffix = "") =>
    n === null ? "—" : `${n.toLocaleString("en-GB", { maximumFractionDigits: 1 })}${suffix}`;

  console.log("Outputs\n");
  console.log(`  Hours recovered / month   ${fmt(r.outputs.hoursRecovered)}`);
  console.log(`  Net benefit / month       ${fmt(r.outputs.netBenefitPerMonth)}`);
  console.log(`  Payback period            ${fmt(r.outputs.paybackMonths, " months")}`);
  console.log(`  Year-one net              ${fmt(r.outputs.yearOneNet)}`);

  if (r.outputs.workings.length) {
    console.log("\nArithmetic — paste this into the model rather than retyping a figure\n");
    for (const w of r.outputs.workings) console.log(`  ${w}`);
  }

  if (r.missing.length) {
    console.log(`\n${r.missing.length} input(s) with no value, so anything downstream of them is blank:`);
    for (const m of r.missing) console.log(`  ${m}`);
    console.log("\nA blank output is honest. A zero would read as a computed result.");
  }

  console.log(`\nProvenance: ${r.measured} of 9 inputs measured.`);
  if (r.measured < 9) {
    console.log("An unlabelled figure will be read as measured. Label every number.");
  }

  const b = r.buckets;
  const unfilled = [
    !b.costSavings && "cost savings",
    !b.revenueUplift && "revenue uplift",
    !b.riskMitigation && "risk mitigation",
  ].filter(Boolean);
  if (unfilled.length) {
    console.log(`\n${unfilled.length} of the three buckets have no effect recorded: ${unfilled.join(", ")}.`);
    console.log("Every deployed system is measured against all three. A bucket that");
    console.log("does not apply needs a reason in the cell, not a blank.");
  }

  // Exit 1 when the readout would not survive its first question.
  const unusable = r.outputs.netBenefitPerMonth === null || unfilled.length > 0;
  process.exit(unusable ? 1 : 0);
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
