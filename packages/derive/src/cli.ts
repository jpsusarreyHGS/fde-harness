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
 *   cli.ts anchors <engagement-dir> [filter]    writable tables and their columns
 *   cli.ts propose <engagement-dir> <spec.json> validate and write a proposal
 *   cli.ts reject  <engagement-dir> <proposal> <reason>  decline it
 *   cli.ts sweep   <engagement-dir> <source> [--against <proposal>]
 *                                              what a source names — a floor under /capture
 *   cli.ts answer  <engagement-dir> "<Q-id or question>" "<answer>" --from "<who>" [--class stated|documented]
 *                                              write a chat answer into evidence/ so /capture can propose it
 *   cli.ts sketch  <engagement-dir>             the pre-G1 alignment sketch, from accepted rows only
 *   cli.ts commands [<engagement-dir>]          every slash command in stage order; with an engagement, where you are and what to run next
 *   cli.ts mockup  <engagement-dir> next        the next concept mockup: version, file, what it rests on, what it must assume
 *   cli.ts mockup  <engagement-dir> log <file> [--assumptions ..] [--shown-to ..] [--reaction ..] [--evidence ..]
 *                                              record it in 05-Build/mockup-ledger.md; refuses without the watermark
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

import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { deriveState } from "./state.ts";
import { tampered, validateState } from "./validate.ts";
import { ID_ALTERNATION, mintIds, prefixMintedBy, type IdPrefix } from "./ids.ts";
import { scanIntake, placementWarnings, CLASS_MEANING, EVIDENCE_CLASSES, EVIDENCE_ROOT, handlingFor } from "./intake.ts";
import {
  acceptProposal,
  parseProposalBlocks,
  pendingProposals,
  proposeFromSpec,
  PROPOSALS_DIR,
  rejectProposal,
  type ProposalSpec,
} from "./proposals.ts";
import { INSTRUMENTS } from "./instruments.ts";
import { dataRows, findTable, parseAnchoredTables } from "./anchors.ts";
import { deskWork, nextConversations, verifyFirst } from "./coach.ts";
import { initEngagement, InitRefused, validateVars } from "./init.ts";
import { checkContract, readContract } from "./contract.ts";
import { WriteRefused } from "./writer.ts";
import { coverage, formatCoverage, formatSweep, sweepText } from "./sweep.ts";
import { recordAnswer, type AnswerClass } from "./answer.ts";
import { renderSketch } from "./sketch.ts";
import { logMockup, planMockup, WATERMARK } from "./mockup.ts";
import { formatCommands, readCommands, suggestNext } from "./commands.ts";
import { dirname, fileURLToPath as toPath } from "./cli-paths.ts";

const argv = process.argv.slice(2);
const SUBCOMMANDS = new Set([
  "intake", "pending", "accept", "reject", "mint", "anchors", "propose", "next",
  "scaffold", "contract-check", "roi", "sweep", "answer", "sketch", "mockup", "commands",
]);
const sub = argv[0] && SUBCOMMANDS.has(argv[0]) ? argv[0] : null;
const args = sub ? argv.slice(1) : argv;

// `commands` works with no engagement: it lists what is available. With one,
// it also says where you are and what to run next.
if (sub === "commands" && !args.find((a) => !a.startsWith("--"))) {
  const root = resolve(dirname(toPath(import.meta.url)), "..", "..", "..");
  console.log(formatCommands(await readCommands(root)));
  process.exit(0);
}

const dirArg = args.find((a) => !a.startsWith("--"));
if (!dirArg) {
  console.error("usage: cli.ts [intake|pending|accept|mint|…|commands] <engagement-dir> [...]");
  process.exit(2);
}
const engagementDir = resolve(dirArg);
const harnessRoot = resolve(engagementDir, "..", "..");

// ------------------------------------------------------------------ helpers

async function isFile(p: string): Promise<boolean> {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

/**
 * Find a source file the way an agent names it: as given, relative to the
 * engagement, or by bare filename inside one of the evidence class folders.
 * Returns the readable text — the sibling `.md` for a converted binary — and
 * the class the folder decided, when it was dropped in one.
 */
async function resolveSource(name: string): Promise<{
  path: string; text: string; evidenceClass: string | null;
} | null> {
  const candidates = [
    isAbsolute(name) ? name : resolve(name),
    resolve(engagementDir, name),
    ...EVIDENCE_CLASSES.map((c) => resolve(engagementDir, ...EVIDENCE_ROOT.split("/"), c, basename(name))),
  ];
  for (const p of candidates) {
    if (!(await isFile(p))) continue;
    const rel = relative(engagementDir, p).split(sep).join("/");
    const cls = new RegExp(`^${EVIDENCE_ROOT}/(${EVIDENCE_CLASSES.join("|")})/`).exec(rel)?.[1] ?? null;
    if (handlingFor(p) === "convert") {
      for (const c of [`${p}.md`, p.replace(/\.[^.]+$/, ".md")]) {
        if (await isFile(c)) return { path: rel, text: await readFile(c, "utf8"), evidenceClass: cls };
      }
      return null;
    }
    if (handlingFor(p) === "needs-service") return null;
    return { path: rel, text: await readFile(p, "utf8"), evidenceClass: cls };
  }
  return null;
}

/** The sponsor's name from the stakeholder map, so the sweep can spot them. */
async function sponsorName(): Promise<string | undefined> {
  try {
    const md = await readFile(resolve(engagementDir, "01-Organisation", "stakeholder-map.md"), "utf8");
    const t = findTable(parseAnchoredTables(md), "stakeholder-map.five-roles");
    const row = t?.rows.find((r) => /sponsor/i.test(r["Role"] ?? ""));
    const name = row?.["Name"]?.trim();
    return name && !/\{\{/.test(name) ? name : undefined;
  } catch {
    return undefined;
  }
}

// --------------------------------------------------------------- subcommands

if (sub === "mockup") {
  const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const consumed = new Set(["--assumptions", "--shown-to", "--reaction", "--evidence"].map((f) => args.indexOf(f) + 1).filter((i) => i > 0));
  const positional = args.filter((a, i) => !a.startsWith("--") && !consumed.has(i));
  const action = positional[1];
  const slug = basename(engagementDir);
  const deliverablesDir = resolve(harnessRoot, "deliverables");

  if (action === "next") {
    const p = await planMockup({ engagementDir, slug, deliverablesDir, harnessRoot });
    console.log(`Next mockup: v${p.version} → deliverables/${slug}/mockups/${p.file}`);
    if (p.previous) console.log(`Previous:    v${p.previous.version} (${p.previous.date}) — say what changed since it.`);
    console.log("");
    console.log(`Rests on (instruments with accepted rows): ${p.builtFrom.length ? p.builtFrom.join(", ") : "nothing — every panel is an assumption"}`);
    console.log(`Must assume (nothing accepted): ${p.missing.length ? p.missing.join(", ") : "nothing"}`);
    if (p.assumptionCandidates.length) {
      console.log("");
      console.log("Assumption candidates — the coach's open questions, for the assumptions panel:");
      for (const c of p.assumptionCandidates) console.log(`  · ${c.ask}  (${c.who})`);
    }
    console.log("");
    console.log(`Watermark, header and footer, verbatim: "${WATERMARK}"`);
    console.log("Synthetic data only. No real names. No live connectors. Log it when written:");
    console.log(`  node packages/derive/src/cli.ts mockup ${dirArg} log ${p.file} --assumptions "<N — see panel>"`);
    process.exit(0);
  }

  if (action === "log") {
    const file = positional[2];
    if (!file) {
      console.error("usage: cli.ts mockup <engagement-dir> log <mockup-vN-YYYY-MM-DD.html> [--assumptions ..] [--shown-to ..] [--reaction ..] [--evidence ..]");
      process.exit(2);
    }
    try {
      const r = await logMockup({
        engagementDir, slug, deliverablesDir, file,
        assumptions: flag("--assumptions"), shownTo: flag("--shown-to"), reaction: flag("--reaction"), evidence: flag("--evidence"),
      });
      console.log(`${r.created ? "Logged" : "Updated"} v${r.version} in 05-Build/mockup-ledger.md — built from: ${r.builtFrom.join(", ") || "nothing accepted yet"}`);
      if (!flag("--shown-to")) {
        console.log("");
        console.log("After the showing, record who saw it and what they said — the buy-in is evidence:");
        console.log(`  node packages/derive/src/cli.ts answer ${dirArg} "Reaction to mockup v${r.version}" "<what they said, verbatim>" --from "<who>"`);
        console.log(`  node packages/derive/src/cli.ts mockup ${dirArg} log ${file} --shown-to "<who, date>" --reaction "<confirmed direction | corrected: ...>" --evidence "02-Workflow/evidence/stated/<date>-answers.md"`);
      }
      process.exit(0);
    } catch (err) {
      if (err instanceof WriteRefused) { console.error(`Refused: ${err.message}`); process.exit(1); }
      throw err;
    }
  }

  console.error("usage: cli.ts mockup <engagement-dir> next | log <file> [flags]");
  process.exit(2);
}

if (sub === "sketch") {
  const res = await renderSketch({
    engagementDir,
    slug: basename(engagementDir),
    harnessRoot,
    deliverablesDir: resolve(harnessRoot, "deliverables"),
  });
  const c = res.counts;
  console.log(`deliverables/${res.path}`);
  console.log("");
  console.log(`  ${c.steps} step(s) · ${c.exceptions} exception(s) · ${c.deadEnds} dead end(s) · ${c.questions} open question(s) · ${c.constraints} constraint(s)`);
  console.log("  From accepted rows only. Pending proposals were not read; nothing was invented.");
  console.log("");
  console.log(
    res.redactions.length
      ? `  Client-safe pass: ${res.redactions.length} name(s) rendered as roles — ${res.redactions.map((r) => r.what).join("; ")}. Approve a name in 00-Setup/client-safe-names.md to show it.`
      : "  Client-safe pass: nothing removed.",
  );
  console.log("  PROVISIONAL — pre-G1 alignment sketch. Show it to be corrected, not approved.");
  const thin = [c.steps === 0 && "no steps", c.exceptions === 0 && "no exceptions", c.questions === 0 && "no open questions"].filter(Boolean);
  if (thin.length) console.log(`  Sparse: ${thin.join(", ")}. That is the honest picture — accept more rows, do not pad the page.`);
  process.exit(0);
}

if (sub === "answer") {
  const fromAt = args.indexOf("--from");
  const classAt = args.indexOf("--class");
  const from = fromAt >= 0 ? args[fromAt + 1] : undefined;
  const cls = classAt >= 0 ? args[classAt + 1] : undefined;
  // Positional arguments, minus the flag values.
  const consumed = new Set([fromAt + 1, classAt + 1].filter((i) => i > 0));
  const positional = args.filter((a, i) => !a.startsWith("--") && !consumed.has(i));
  const question = positional[1];
  const answer = positional[2];
  if (!question || !answer || !from) {
    console.error('usage: cli.ts answer <engagement-dir> "<Q-id or question>" "<answer>" --from "<who said it>" [--class stated|documented]');
    console.error("");
    console.error("Writes the answer, verbatim, into 02-Workflow/evidence/<class>/<date>-answers.md,");
    console.error("where intake lists it and /capture reads it. Nothing reaches a register from");
    console.error("here — that still takes a proposal and an accept. The class defaults to stated,");
    console.error("because an answer given in conversation is something a person said.");
    process.exit(2);
  }
  if (cls !== undefined && cls !== "stated" && cls !== "documented") {
    console.error(`--class must be stated or documented, not ${JSON.stringify(cls)}. An answer cannot be observed or system evidence.`);
    process.exit(2);
  }
  try {
    const res = await recordAnswer(engagementDir, {
      question, answer, from, evidenceClass: cls as AnswerClass | undefined,
    });
    console.log(`${res.created ? "Created" : "Appended to"} ${res.path} (${res.evidenceClass}${res.questionId ? `, answers ${res.questionId}` : ""})`);
    console.log("");
    console.log("Nothing has reached a register. Propose it with:");
    console.log("");
    console.log(`  /capture ${res.path}`);
    process.exit(0);
  } catch (err) {
    if (err instanceof WriteRefused) {
      console.error(`Refused: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

if (sub === "sweep") {
  const rest = args.filter((a) => !a.startsWith("--"));
  const sourceArg = rest[1];
  const againstAt = args.indexOf("--against");
  const against = againstAt >= 0 ? args[againstAt + 1] : undefined;
  if (!sourceArg) {
    console.error("usage: cli.ts sweep <engagement-dir> <source-file> [--against <proposal.md>]");
    console.error("");
    console.error("Prints what a source names — people with roles, systems, acronyms,");
    console.error("figures — so a capture can be checked against a floor. Writes nothing.");
    console.error("With --against, prints rows proposed per instrument beside what the");
    console.error("sweep found, and flags an instrument the source supported that got none.");
    process.exit(2);
  }
  const src = await resolveSource(sourceArg);
  if (!src) {
    console.error(`Cannot read ${sourceArg} — not found, not converted yet, or a format that needs a transcription/description pass first.`);
    process.exit(2);
  }
  const result = sweepText(src.text, { sponsorName: await sponsorName() });
  if (!against) {
    console.log(formatSweep(result, src.path, src.evidenceClass ?? undefined));
    process.exit(0);
  }
  let proposalMd: string;
  try {
    proposalMd = await readFile(resolve(engagementDir, ...PROPOSALS_DIR.split("/"), against), "utf8");
  } catch {
    console.error(`no proposal ${against} in ${PROPOSALS_DIR}`);
    process.exit(2);
  }
  const blocks = parseProposalBlocks(proposalMd).map((b) => ({ instrument: b.target.instrument, rows: b.rows.length }));
  const lines = coverage(blocks, result);
  console.log(formatCoverage(lines, against, src.path));
  process.exit(lines.some((l) => l.check) ? 1 : 0);
}

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
  // Warn, never reclassify. The folder decided; this says when the folder
  // and the file disagree, in words that explain what the disagreement costs.
  const warnings = await placementWarnings(engagementDir, items);
  if (warnings.length) {
    console.log("");
    console.log("Placement — the folder still decides the class; check these:");
    for (const w of warnings) console.log(`  ${w.message}`);
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
    console.log("No proposed rows awaiting accept.");
    process.exit(0);
  }
  console.error(`${p.length} file(s) of proposed rows — review each, fix any cell, then accept or reject:`);
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
      if (filter && !t.anchor.name.toLowerCase().includes(filter) &&
          !inst.path.toLowerCase().includes(filter)) continue;
      // Labels and kv tables are writable by fill, not by row. The five roles
      // and the sponsor's seven questions live there, and an agent that only
      // ever saw registers had nowhere to put a name it had just read.
      if (t.anchor.role !== "register") {
        const keyCol = t.anchor.keyColumn ?? t.headers[0] ?? "";
        const ansCol = t.anchor.answerColumn ?? (t.anchor.role === "kv" ? t.headers[1] : undefined);
        const keys = t.rows.map((r) => (r[keyCol] ?? "").replace(/[*_`]/g, "").trim()).filter(Boolean);
        if (!keys.length) continue;
        console.log(t.anchor.name);
        console.log(`  ${inst.path}`);
        console.log(`  ${t.headers.join(" | ")}`);
        console.log(`  mode=fill — key column=${keyCol}${ansCol ? `, answer column=${ansCol}` : ""}; sets cells on an existing row, never adds one`);
        console.log(`  keys: ${keys.join(" | ")}`);
        console.log("");
        shown++;
        continue;
      }
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
    console.error(filter ? `No writable table matches "${filter}".` : "No writable tables found.");
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
    console.error('A labels or kv table takes { ..., "mode": "fill", "rows": [ { "<key column>": "<existing key>", "<answer column>": "..." } ] }.');
    console.error("Run `anchors` first for the real column names and keys.");
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
    console.error(`${rows} row(s) proposed — review, fix any cell, then accept. Nothing written to a register yet.`);
    // Coverage, when the source can be found: under-extraction is visible at
    // the moment it happens, not at the gate.
    const src = await resolveSource(spec.source);
    if (src) {
      const result = sweepText(src.text, { sponsorName: await sponsorName() });
      const blocks = spec.blocks.map((b) => ({ instrument: b.instrument, rows: b.rows?.length ?? 0 }));
      console.error("");
      console.error(formatCoverage(coverage(blocks, result), name, src.path));
      console.error("");
    }
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

if (sub === "commands") {
  const { where, next } = suggestNext(state);
  // The command files live with this script, not with the engagement.
  const root = resolve(dirname(toPath(import.meta.url)), "..", "..", "..");
  console.log(formatCommands(await readCommands(root), { slug: basename(engagementDir), where, next }));
  process.exit(0);
}

if (sub === "next") {
  const n = Number(args.filter((a) => !a.startsWith("--"))[1] ?? "3");
  const groups = nextConversations(state.coach, Number.isFinite(n) ? n : 3);
  const verify = verifyFirst(state.coach);
  if (!groups.length && !verify.length) {
    console.log("Nothing to ask. Every gate criterion is met and the chain is intact.");
    process.exit(0);
  }
  // Four lines under every entry, always in this order. `why` is the
  // ranking; `means` is the question; `goes` is the cell. A question that
  // arrives without its meaning gets dismissed as noise — the best one in
  // the SIM-01 queue was.
  const entry = (q: (typeof state.coach)[number]) => {
    console.log(`  · ${q.ask}`);
    console.log(`      why:    ${q.why}`);
    if (q.blocks) console.log(`      blocks: ${q.blocks}`);
    console.log(`      means:  ${q.means}`);
    console.log(`      goes:   ${q.goes}`);
  };
  if (verify.length) {
    console.log("\nVerify first — already on file; the bar is being able to say it");
    for (const q of verify) entry(q);
  }
  for (const g of groups) {
    console.log(`
${g.whoName ? `${g.whoName} — ${g.who}` : `${g.who} (no name in the stakeholder map)`}`);
    for (const q of g.questions.slice(0, 4)) entry(q);
    if (g.questions.length > 4) {
      console.log(`  … and ${g.questions.length - 4} more for the same conversation`);
    }
  }
  const desk = deskWork(state.coach);
  if (desk.length) {
    console.log("\nYours to fix — no conversation will resolve these");
    for (const q of desk.slice(0, 5)) entry(q);
    if (desk.length > 5) console.log(`  … and ${desk.length - 5} more`);
  }

  console.log("");
  console.log(
    `${state.coach.length} item(s) in the queue: ${state.coach.length - desk.length - verify.length} to ask, ` +
      `${verify.length} to verify, ${desk.length} to fix.`,
  );
  console.log("An answer given in conversation is lost by morning. Write it down as you get it:");
  console.log(`  node packages/derive/src/cli.ts answer ${dirArg} "<Q-id or question>" "<answer>" --from "<who>"`);
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
