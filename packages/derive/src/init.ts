/**
 * Initialising an engagement, as code.
 *
 * `scaffoldEngagement()` creates the tree and seeds it from templates. That is
 * most of the job but not all of it, and the missing parts were living in
 * prose in `init-engagement/SKILL.md` — a second implementation an agent
 * interpreted, with its own directory list and a `mkdir` block written in bash
 * brace expansion that PowerShell does not expand. On Windows that produced
 * one directory literally named `{00-Setup,01-Organisation,…}`.
 *
 * So this module owns the rest of what the skill described, and the skill
 * becomes an interview that calls it:
 *
 *   - the initial `state.json`, derived rather than hand-written
 *   - a `Q-` for every value that came in as `TBD`
 *   - a re-scan for placeholders that survived, which matters on the
 *     migration path where nothing was written and the scaffolder therefore
 *     reports nothing
 *
 * **Backfill is the normal case, not the exception.** An engagement created
 * before a template existed is brought forward by running this again; existing
 * files are never touched.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";
import { scaffoldEngagement, type EngagementVars, type ScaffoldResult } from "./scaffold.ts";
import { deriveState } from "./state.ts";
import { mintIds } from "./ids.ts";
import { appendRows } from "./writer.ts";

const RESIDENCY = ["client-tenant", "hgs-tenant", "tbd"] as const;
const LABOUR = ["works-council", "union", "none", "unknown"] as const;

/** Fields the templates cannot sensibly default. */
const REQUIRED = ["CLIENT_NAME", "SPONSOR", "SCOPE", "NON_GOALS"] as const;

export class InitRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitRefused";
  }
}

export interface InitResult extends ScaffoldResult {
  slug: string;
  /** Files this run wrote into an engagement that already existed. */
  backfilled: string[];
  /** `{{PLACEHOLDER}}` tokens still present in files on disk, after the run. */
  survivingPlaceholders: { file: string; keys: string[] }[];
  /** `Q-` ids raised for values that came in as TBD. */
  questionsRaised: string[];
  stateWritten: boolean;
  /** True when the engagement directory already held files. */
  backfill: boolean;
}

/**
 * Validate a vars object that arrived as JSON.
 *
 * TypeScript checks nothing at runtime, and a bad `RESIDENCY` flows straight
 * into instrument prose where it reads as a decision somebody made.
 */
export function validateVars(raw: unknown, slug: string): EngagementVars {
  if (!raw || typeof raw !== "object") {
    throw new InitRefused("vars must be a JSON object");
  }
  const v = raw as Record<string, unknown>;

  const missing = REQUIRED.filter((k) => typeof v[k] !== "string" || !(v[k] as string).trim());
  if (missing.length) {
    throw new InitRefused(
      `missing required field(s): ${missing.join(", ")}. ` +
        "SLUG comes from the directory name, so it is not required here.",
    );
  }

  // A SLUG that disagrees with the path would scaffold one engagement while
  // the operator watched another directory.
  if (typeof v["SLUG"] === "string" && v["SLUG"] && v["SLUG"] !== slug) {
    throw new InitRefused(
      `vars say SLUG=${JSON.stringify(v["SLUG"])} but the path says ${JSON.stringify(slug)}. ` +
        "Fix one — a mismatch scaffolds a directory you are not looking at.",
    );
  }

  for (const [key, allowed] of [
    ["RESIDENCY", RESIDENCY as readonly string[]],
    ["LABOUR", LABOUR as readonly string[]],
  ] as const) {
    const got = v[key];
    if (got !== undefined && !allowed.includes(got as string)) {
      throw new InitRefused(
        `${key}=${JSON.stringify(got)} is not one of: ${allowed.join(", ")}`,
      );
    }
  }

  return { ...(v as unknown as EngagementVars), SLUG: slug };
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

/**
 * Placeholders still on disk after the run.
 *
 * `ScaffoldResult.unresolved` only reports files this run wrote, so on a
 * re-run it is empty no matter what the live files contain. That is exactly
 * backwards for a migration, where nothing is written and everything is
 * inherited.
 */
async function scanPlaceholders(root: string): Promise<{ file: string; keys: string[] }[]> {
  const out: { file: string; keys: string[] }[] = [];
  for (const f of await walk(root)) {
    if (!f.endsWith(".md")) continue;
    const body = await readFile(f, "utf8");
    const keys = [...new Set([...body.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]!))];
    if (keys.length) out.push({ file: relative(root, f).split(sep).join("/"), keys });
  }
  return out;
}

/**
 * Raise a `Q-` for every field that came in unresolved.
 *
 * A `TBD` in an instrument is a gap nobody is chasing. The runbook's answer to
 * a gap is a question with an owner, so init produces those rather than
 * leaving the FDE to notice.
 */
async function raiseTbdQuestions(
  engagementDir: string,
  vars: EngagementVars,
  today: string,
): Promise<string[]> {
  const gaps: { field: string; question: string; who: string; blocks: string }[] = [];
  const tbd = (s: string | undefined) => !s || !s.trim() || /^tbd$/i.test(s.trim());

  if (tbd(vars.SYSTEMS)) {
    gaps.push({
      field: "SYSTEMS",
      question: "Which systems does this workflow actually touch?",
      who: "Systems gatekeeper",
      blocks: "03-Systems/systems-inventory.md",
    });
  }
  if (tbd(vars.RESIDENCY) || vars.RESIDENCY === "tbd") {
    gaps.push({
      field: "RESIDENCY",
      question: "Where does captured evidence live — client tenant or HGS tenant?",
      who: "Security owner",
      // Not a formality: capture is hard-stopped until this is settled,
      // because evidence taken under unresolved terms may have to be destroyed.
      blocks: "all capture — discovery-analyst hard-stops without signed terms",
    });
  }
  if (!vars.LABOUR || vars.LABOUR === "unknown") {
    gaps.push({
      field: "LABOUR",
      question: "Is there a works council or union with a say in workplace observation?",
      who: "Executive sponsor",
      blocks: "the observation method — consultation is not notice",
    });
  }
  if (tbd(vars.ONTOLOGY_REPO)) {
    gaps.push({
      field: "ONTOLOGY_REPO",
      question: "Which repository holds the ontology for this client?",
      who: "Technical owner",
      blocks: "03-Systems/ontology/ promotion",
    });
  }

  if (!gaps.length) return [];

  const { ids } = await mintIds(engagementDir, "Q", gaps.length);
  await appendRows(
    engagementDir,
    "02-Workflow/open-questions.md",
    "open-questions.rows",
    gaps.map((g, i) => ({
      Id: ids[i]!,
      Question: g.question,
      "Why it matters": `${g.field} was left unresolved at init.`,
      "Who can answer": g.who,
      Blocks: g.blocks,
      Raised: today,
      Answered: "",
      Answer: "",
    })),
  );
  return ids;
}

export interface InitOptions {
  /** The engagement directory — `<engagements-root>/<slug>`. */
  engagementDir: string;
  /**
   * Where the *assets* live — templates and the practice skill library.
   *
   * Deliberately separate from where the engagement lives. They are the same
   * directory in normal use, but conflating them means a scaffold run against
   * a scratch tree writes its deliverables into the real repo. That happened.
   */
  harnessRoot: string;
  /** Defaults to the sibling of the engagements root, not of `harnessRoot`. */
  deliverablesRoot?: string;
  vars: EngagementVars;
  /** Report what would happen; write nothing. */
  dryRun?: boolean;
}

/**
 * Create or bring forward an engagement.
 *
 * Safe to run on a live engagement: existing files are never overwritten, and
 * the report separates what was created now from what was already there.
 */
export async function initEngagement(opts: InitOptions): Promise<InitResult> {
  const { engagementDir, harnessRoot, vars } = opts;
  const slug = basename(engagementDir);
  const engagementsRoot = dirname(engagementDir);

  const backfill = (await walk(engagementDir)).length > 0;

  if (opts.dryRun) {
    const templates = join(harnessRoot, ".claude", "templates", "engagement-init");
    const would: string[] = [];
    for (const src of await walk(templates)) {
      if (!src.endsWith(".template")) continue;
      const rel = relative(templates, src).split(sep).join("/").replace(/\.template$/, "");
      if (!(await exists(join(engagementDir, ...rel.split("/"))))) would.push(rel);
    }
    return {
      slug, backfill,
      created: [], skipped: [], unresolved: [], directories: 0,
      backfilled: would,
      survivingPlaceholders: await scanPlaceholders(engagementDir),
      questionsRaised: [],
      stateWritten: false,
    };
  }

  const deliverablesRoot = opts.deliverablesRoot ?? join(dirname(engagementsRoot), "deliverables");

  const res = await scaffoldEngagement({
    engagementsRoot,
    // Both are optional on the function and both are required for parity with
    // what the skill promised. Omitting feedbackDir leaves the directory there
    // and the eight per-role files missing, which is the worst shape: it looks
    // done.
    deliverablesRoot,
    templatesDir: join(harnessRoot, ".claude", "templates", "engagement-init"),
    feedbackDir: join(harnessRoot, ".claude", "templates", "harness-improver", "feedback"),
    vars,
  });

  const today = vars.DATE ?? new Date().toISOString().slice(0, 10);

  // Only on a first run. Re-running must not append a second copy of the same
  // question — the register is append-only and a duplicate Q- is noise the
  // coach would then rank.
  const questionsRaised = backfill ? [] : await raiseTbdQuestions(engagementDir, vars, today);

  const state = await deriveState({
    engagementDir,
    slug,
    harnessRoot,
    datasourcesDir: join(harnessRoot, "datasources"),
    deliverablesDir: deliverablesRoot,
  });
  await writeFile(
    join(engagementDir, "state.json"),
    JSON.stringify(state, null, 2) + "\n",
    "utf8",
  );

  return {
    ...res,
    slug,
    backfill,
    backfilled: backfill ? res.created : [],
    survivingPlaceholders: await scanPlaceholders(engagementDir),
    questionsRaised,
    stateWritten: true,
  };
}

/**
 * Every directory the scaffolder creates, for tests and for anything that
 * needs to assert the tree without reaching into the module.
 */
export async function engagementSubdirs(engagementDir: string): Promise<string[]> {
  const out: string[] = [];
  const walkDirs = async (dir: string, prefix: string) => {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      out.push(rel);
      await walkDirs(join(dir, e.name), rel);
    }
  };
  await walkDirs(engagementDir, "");
  return out.sort();
}
