/**
 * Concept mockups: the guardrails, as code.
 *
 * The harness stops an FDE building on unearned assumptions. Until now it
 * also stopped them cheaply *testing* assumptions with the people who hold
 * the answers — the first thing a stakeholder ever saw rendered was the MVP.
 * The concept mockup fills that gap: one self-contained HTML page of what
 * the thing could look like, synthetic data only, every gap in discovery
 * rendered as a labelled assumption for the stakeholder to correct.
 *
 * Cheap must not become dangerous. Two things travel with every mockup and
 * neither is left to prose:
 *
 *   - the watermark — "Concept visualization — not a build commitment or
 *     spec" — in the header and the footer, because stakeholders screenshot
 *     these and forward them
 *   - the ledger row — which instruments had rows when it was built, what
 *     was assumed, who saw it, what they said — so "why does the MVP differ
 *     from the mockup?" has a written answer
 *
 * `logMockup` refuses a file without the watermark, refuses a file that
 * names a real person from the stakeholder map (a mockup is synthetic; the
 * client-safe rule applies), and mints the version number so no two mockups
 * share one.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { answeredRows, dataRows, findTable, parseAnchoredTables, splitRow } from "./anchors.ts";
import { appendRows, escapeCell, WriteRefused } from "./writer.ts";
import { loadNames } from "./clientsafe.ts";
import { INSTRUMENTS } from "./instruments.ts";
import { deriveState } from "./state.ts";
import { nextConversations } from "./coach.ts";

export const MOCKUP_DIR = "mockups";
export const WATERMARK = "Concept visualization — not a build commitment or spec";
export const LEDGER_PATH = "05-Build/mockup-ledger.md";
export const LEDGER_ANCHOR = "mockup-ledger.rows";

const FILE_RE = /^mockup-v(\d+)-(\d{4}-\d{2}-\d{2})\.html$/;

export interface MockupRef {
  version: number;
  date: string;
  /** Relative to the deliverables root. */
  path: string;
}

/** Every mockup on disk, oldest first. */
export async function listMockups(deliverablesDir: string, slug: string): Promise<MockupRef[]> {
  let files: string[];
  try { files = await readdir(join(deliverablesDir, slug, MOCKUP_DIR)); } catch { return []; }
  return files
    .map((f) => ({ f, m: FILE_RE.exec(f) }))
    .filter((x): x is { f: string; m: RegExpExecArray } => !!x.m)
    .map(({ f, m }) => ({ version: Number(m[1]), date: m[2]!, path: `${slug}/${MOCKUP_DIR}/${f}` }))
    .sort((a, b) => a.version - b.version);
}

export interface MockupPlan {
  version: number;
  file: string;
  /** Instrument ids with at least one accepted row — what the mockup can rest on. */
  builtFrom: string[];
  /** Instruments with nothing — what will have to be assumed. */
  missing: string[];
  /** The coach's top questions: candidates for the assumptions panel. */
  assumptionCandidates: { ask: string; who: string; means: string }[];
  /** The last mockup, if any, so v(N+1) can say what changed. */
  previous: MockupRef | null;
}

/**
 * What the next mockup would be: its number, its filename, what it can rest
 * on and what it will have to assume. Printed before the agent writes a line,
 * so the assumptions panel is populated from the real gaps rather than from
 * what the agent happened to notice.
 */
export async function planMockup(opts: {
  engagementDir: string; slug: string; deliverablesDir: string; harnessRoot?: string; now?: Date;
}): Promise<MockupPlan> {
  const now = opts.now ?? new Date();
  const existing = await listMockups(opts.deliverablesDir, opts.slug);
  const version = (existing.at(-1)?.version ?? 0) + 1;
  const date = now.toISOString().slice(0, 10);
  const state = await deriveState({
    engagementDir: opts.engagementDir, slug: opts.slug,
    harnessRoot: opts.harnessRoot, deliverablesDir: opts.deliverablesDir,
  });
  const discovery = state.instruments.filter((i) => ["01", "02", "03", "04"].includes(i.stage) && i.present);
  const builtFrom = discovery.filter((i) => i.rows > 0).map((i) => i.id);
  // The stakeholder map's count is its decision-rights register; a named
  // role lives in the five-roles labels table and counts as content here —
  // "who the screen is for" is the first thing a mockup rests on.
  let namedRoles = 0;
  try {
    const md = await readFile(join(opts.engagementDir, "01-Organisation", "stakeholder-map.md"), "utf8");
    const t = findTable(parseAnchoredTables(md), "stakeholder-map.five-roles");
    namedRoles = t ? answeredRows(t).filter((r) => !/\{\{/.test(r["Name"] ?? "")).length : 0;
  } catch { /* no map */ }
  if (namedRoles > 0 && !builtFrom.includes("stakeholder-map")) builtFrom.unshift("stakeholder-map");
  const missing = discovery
    .filter((i) => i.rows === 0 && INSTRUMENTS.find((d) => d.id === i.id)?.coverage && !builtFrom.includes(i.id))
    .map((i) => i.id);
  const assumptionCandidates = nextConversations(state.coach, 6)
    .flatMap((g) => g.questions.slice(0, 2).map((q) => ({ ask: q.ask.replace(/^Q-\d+:\s*/, ""), who: g.who, means: q.means })));
  return { version, file: `mockup-v${version}-${date}.html`, builtFrom, missing, assumptionCandidates, previous: existing.at(-1) ?? null };
}

export interface LogMockupOptions {
  engagementDir: string;
  slug: string;
  deliverablesDir: string;
  /** The filename under deliverables/<slug>/mockups/. */
  file: string;
  /** What was assumed, in one line or a count with a pointer to the panel. */
  assumptions?: string;
  shownTo?: string;
  reaction?: string;
  /** The evidence entry the reaction was written to, e.g. the answers file. */
  evidence?: string;
  now?: Date;
}

export interface LogMockupResult {
  version: number;
  created: boolean;
  builtFrom: string[];
}

/**
 * Record a mockup in the ledger — or, for one already recorded, fill in who
 * saw it and what they said.
 *
 * Refuses: a file that is not there, a file without the watermark twice, a
 * name that is not the mockup's own convention, and a file that carries a
 * real person's name from the stakeholder map without the allow-list.
 */
export async function logMockup(opts: LogMockupOptions): Promise<LogMockupResult> {
  const m = FILE_RE.exec(opts.file);
  if (!m) {
    throw new WriteRefused(
      `${opts.file} is not a mockup filename. Use mockup-v<N>-<YYYY-MM-DD>.html — \`cli.ts mockup <dir> next\` prints the right one.`,
    );
  }
  const version = Number(m[1]);
  const abs = join(opts.deliverablesDir, opts.slug, MOCKUP_DIR, opts.file);
  let html: string;
  try {
    await stat(abs);
    html = await readFile(abs, "utf8");
  } catch {
    throw new WriteRefused(`deliverables/${opts.slug}/${MOCKUP_DIR}/${opts.file} does not exist. Write the page first; the ledger records what exists.`);
  }
  const marks = html.split(WATERMARK).length - 1;
  if (marks < 2) {
    throw new WriteRefused(
      `${opts.file} carries the watermark ${marks} time(s); it must appear in the header and the footer. ` +
        `"${WATERMARK}" travels with every screenshot — add it, then log.`,
    );
  }

  // Synthetic means synthetic. A stakeholder's name in a mockup is the
  // client-safe failure in a new costume.
  const { roles, allow } = await loadNames(opts.engagementDir);
  const named = [...roles.keys()].filter((n) => !allow.has(n) && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(html));
  if (named.length) {
    throw new WriteRefused(
      `${opts.file} names ${named.join(", ")} — a mockup is synthetic and client-facing. Use the role, or approve the name in 00-Setup/client-safe-names.md.`,
    );
  }

  const ledgerAbs = join(opts.engagementDir, ...LEDGER_PATH.split("/"));
  let md: string;
  try { md = await readFile(ledgerAbs, "utf8"); } catch {
    throw new WriteRefused(`${LEDGER_PATH} is missing — run /init-engagement to bring the engagement forward.`);
  }
  const table = findTable(parseAnchoredTables(md), LEDGER_ANCHOR);
  if (!table) throw new WriteRefused(`no anchored table ${LEDGER_ANCHOR} in ${LEDGER_PATH}`);
  const existing = dataRows(table).find((r) => Number((r["Version"] ?? "").replace(/^v/i, "")) === version);

  const now = opts.now ?? new Date();
  const plan = await planMockup({ engagementDir: opts.engagementDir, slug: opts.slug, deliverablesDir: opts.deliverablesDir, now });
  const builtFrom = plan.builtFrom;

  if (!existing) {
    await appendRows(opts.engagementDir, LEDGER_PATH, LEDGER_ANCHOR, [{
      Version: `v${version}`,
      Date: m[2]!,
      File: `deliverables/${opts.slug}/${MOCKUP_DIR}/${opts.file}`,
      "Built from": builtFrom.length ? builtFrom.join(", ") : "nothing accepted yet — every panel is an assumption",
      Assumptions: opts.assumptions ?? "",
      "Shown to": opts.shownTo ?? "",
      Reaction: opts.reaction ?? "",
      Evidence: opts.evidence ?? "",
    }]);
    return { version, created: true, builtFrom };
  }

  // Fill blanks on the existing row; never overwrite what someone recorded.
  const lines = md.split(/\r?\n/);
  const headers = table.headers;
  const at = lines.findIndex((l) => new RegExp(`^\\|\\s*v?${version}\\s*\\|`).test(l));
  if (at < 0) throw new WriteRefused(`could not find the v${version} row to update`);
  const cells = splitRow(lines[at]!);
  while (cells.length < headers.length) cells.push("");
  const set = (col: string, v: string | undefined) => {
    if (!v) return;
    const ci = headers.indexOf(col);
    const cur = (cells[ci] ?? "").trim();
    if (cur && cur !== v) {
      throw new WriteRefused(`v${version} already records ${col}: "${cur}". The ledger is append-only; log the next showing as a new reaction line in the evidence file, or edit the row deliberately.`);
    }
    cells[ci] = escapeCell(v);
  };
  set("Assumptions", opts.assumptions);
  set("Shown to", opts.shownTo);
  set("Reaction", opts.reaction);
  set("Evidence", opts.evidence);
  lines[at] = `| ${cells.join(" | ")} |`;
  await writeFile(ledgerAbs, lines.join("\n"), "utf8");
  return { version, created: false, builtFrom };
}
