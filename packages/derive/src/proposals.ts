/**
 * Propose, then confirm.
 *
 * An agent never writes a register row directly. It writes a proposal; the
 * FDE skims it and accepts; **code** mints the ids and appends the rows.
 *
 * This is the same two-phase discipline the build write path uses, applied to
 * discovery — and for the same reason. An extraction from a brain dump is a
 * model's reading of what happened, and a model's reading entering the
 * evidence chain unchallenged would undermine the one thing the chain is for.
 *
 * The ergonomics matter as much as the safety. Confirming forty rows must be
 * a skim, not forty prompts — so a proposal is a normal markdown file the FDE
 * can read, edit, and delete lines from before accepting.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseAnchoredTables, splitRow } from "./anchors.ts";
import { knownIds, mintIds, type IdPrefix } from "./ids.ts";
import { appendRows, escapeCell, tableColumns, WriteRefused } from "./writer.ts";

export const PROPOSALS_DIR = "02-Workflow/proposals";

export interface ProposalTarget {
  /** Instrument path relative to the engagement root. */
  instrument: string;
  /** Anchored register table to append to. */
  anchor: string;
  /** Prefix whose sequence supplies the id column, when the table has one. */
  prefix?: IdPrefix;
  /** Column the minted id goes in. */
  idColumn?: string;
}

export interface ProposalBlock extends ProposalTarget {
  columns: string[];
  /** Rows keyed by column, with the id column left empty — code mints it. */
  rows: Record<string, string>[];
}

export interface WriteProposalOptions {
  engagementDir: string;
  /** What this was extracted from, for the header and the audit trail. */
  source: string;
  /** Agent that produced it. */
  agent: string;
  blocks: ProposalBlock[];
  now?: Date;
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

/**
 * Write a proposal file.
 *
 * Ids are deliberately **not** minted here. Between proposing and accepting,
 * another session may have written rows; minting at accept time is what keeps
 * the sequence contiguous and collision-free.
 */
export async function writeProposal(opts: WriteProposalOptions): Promise<string> {
  const now = opts.now ?? new Date();
  const dir = join(opts.engagementDir, ...PROPOSALS_DIR.split("/"));
  await mkdir(dir, { recursive: true });

  const safeSource = opts.source.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 48);
  const name = `${stamp(now)}-${safeSource}.md`;
  const total = opts.blocks.reduce((n, b) => n + b.rows.length, 0);

  const out: string[] = [
    `# Proposed rows — ${opts.source}`,
    "",
    `<!-- proposal source=${opts.source} agent=${opts.agent} at=${now.toISOString()} -->`,
    "",
    `**${total} row(s) proposed. Nothing has been written yet.**`,
    "",
    "Read them. Fix what is wrong, delete what should not exist, then accept:",
    "",
    "```",
    `node packages/derive/src/cli.ts accept <engagement-dir> ${name}`,
    "```",
    "",
    "Ids are left blank on purpose — they are minted at accept time so the",
    "sequence stays contiguous even if another session wrote in the meantime.",
    "Leave the id column empty.",
    "",
  ];

  for (const b of opts.blocks) {
    out.push(`<!-- propose target=${b.instrument} anchor=${b.anchor}${b.prefix ? ` prefix=${b.prefix}` : ""}${b.idColumn ? ` idColumn=${b.idColumn}` : ""} -->`);
    out.push("");
    out.push(`## ${b.anchor} — ${b.rows.length} row(s)`);
    out.push("");
    out.push(`| ${b.columns.join(" | ")} |`);
    out.push(`|${b.columns.map(() => "---").join("|")}|`);
    for (const r of b.rows) {
      out.push(`| ${b.columns.map((c) => escapeCell(r[c] ?? "")).join(" | ")} |`);
    }
    out.push("");
  }

  const path = join(dir, name);
  await writeFile(path, out.join("\n"), "utf8");
  return name;
}

export interface AcceptResult {
  proposal: string;
  written: { anchor: string; rows: number; ids: string[] }[];
  /** Citations pointing at ids that do not exist. Blocks the accept. */
  danglingCitations: { anchor: string; row: number; cited: string }[];
  totalRows: number;
}

const PROPOSE_RE =
  /<!--\s*propose\s+target=(\S+)\s+anchor=(\S+)(?:\s+prefix=(\S+))?(?:\s+idColumn=(\S+))?\s*-->/;

/**
 * Accept a proposal: mint ids, validate citations, append rows.
 *
 * Refuses the whole file if any citation dangles. A partial accept would put
 * the register in a state nobody chose, and the whole point of proposing is
 * that the FDE decided what goes in.
 */
export async function acceptProposal(
  engagementDir: string,
  proposalName: string,
): Promise<AcceptResult> {
  const path = join(engagementDir, ...PROPOSALS_DIR.split("/"), proposalName);
  let md: string;
  try {
    md = await readFile(path, "utf8");
  } catch {
    throw new WriteRefused(`no proposal ${proposalName} in ${PROPOSALS_DIR}`);
  }
  if (/<!--\s*accepted /.test(md)) {
    throw new WriteRefused(
      `${proposalName} was already accepted. Accepting twice would duplicate every row.`,
    );
  }

  const lines = md.split(/\r?\n/);
  const blocks: { target: ProposalTarget; columns: string[]; rows: string[][] }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = PROPOSE_RE.exec(lines[i]!);
    if (!m) continue;
    const target: ProposalTarget = {
      instrument: m[1]!,
      anchor: m[2]!,
      ...(m[3] ? { prefix: m[3] as IdPrefix } : {}),
      ...(m[4] ? { idColumn: m[4] } : {}),
    };
    let j = i + 1;
    while (j < lines.length && !lines[j]!.trim().startsWith("|")) j++;
    if (j >= lines.length) continue;
    const columns = splitRow(lines[j]!);
    const rows: string[][] = [];
    for (let k = j + 2; k < lines.length && lines[k]!.trim().startsWith("|"); k++) {
      const cells = splitRow(lines[k]!);
      if (cells.every((c) => c.trim() === "")) continue;
      rows.push(cells);
    }
    blocks.push({ target, columns, rows });
    i = j;
  }

  if (blocks.length === 0) {
    throw new WriteRefused(`${proposalName} contains no propose blocks`);
  }

  // Citations are checked against reality before anything is written. An
  // extraction that invented EV-099 is caught here, not by the audit later.
  const known = await knownIds(engagementDir);
  const dangling: AcceptResult["danglingCitations"] = [];
  const CITE = /\b(EV|EX|REQ|AL|CQ|Q)-\d+\b/g;
  for (const b of blocks) {
    b.rows.forEach((cells, rowIdx) => {
      for (const cell of cells) {
        for (const m of cell.matchAll(CITE)) {
          const id = m[0];
          const prefix = m[1] as IdPrefix;
          if (!known.get(prefix)?.has(id)) {
            dangling.push({ anchor: b.target.anchor, row: rowIdx + 1, cited: id });
          }
        }
      }
    });
  }
  if (dangling.length) {
    return {
      proposal: proposalName,
      written: [],
      danglingCitations: dangling,
      totalRows: 0,
    };
  }

  const written: AcceptResult["written"] = [];
  for (const b of blocks) {
    if (b.rows.length === 0) continue;

    const realColumns = await tableColumns(
      engagementDir,
      b.target.instrument,
      b.target.anchor,
    );

    let ids: string[] = [];
    if (b.target.prefix) {
      ({ ids } = await mintIds(engagementDir, b.target.prefix, b.rows.length));
    }

    const rows: Record<string, string>[] = b.rows.map((cells, idx) => {
      const row: Record<string, string> = {};
      b.columns.forEach((c, ci) => {
        if (!realColumns.includes(c)) return; // proposal carried a stray column
        row[c] = cells[ci] ?? "";
      });
      const idCol = b.target.idColumn ?? realColumns[0];
      if (b.target.prefix && idCol) row[idCol] = ids[idx]!;
      return row;
    });

    const res = await appendRows(engagementDir, b.target.instrument, b.target.anchor, rows);
    written.push({ anchor: b.target.anchor, rows: res.written, ids });
  }

  const marked =
    md.replace(
      /(\*\*\d+ row\(s\) proposed\. Nothing has been written yet\.\*\*)/,
      `<!-- accepted at=${new Date().toISOString()} -->\n\n**Accepted.** Rows are in the registers; ids are listed below.`,
    ) +
    "\n\n## Accepted\n\n" +
    written
      .map((w) => `- \`${w.anchor}\` — ${w.rows} row(s)${w.ids.length ? `: ${w.ids[0]}–${w.ids.at(-1)}` : ""}`)
      .join("\n") +
    "\n";
  await writeFile(path, marked, "utf8");

  return {
    proposal: proposalName,
    written,
    danglingCitations: [],
    totalRows: written.reduce((n, w) => n + w.rows, 0),
  };
}

/** Proposals awaiting a decision. */
export async function pendingProposals(engagementDir: string): Promise<string[]> {
  const dir = join(engagementDir, ...PROPOSALS_DIR.split("/"));
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const f of files.sort()) {
    if (!f.endsWith(".md")) continue;
    const md = await readFile(join(dir, f), "utf8");
    if (!/<!--\s*accepted /.test(md)) out.push(f);
  }
  return out;
}

/** Rows a proposal would write, without writing them. */
export async function previewProposal(
  engagementDir: string,
  proposalName: string,
): Promise<{ anchor: string; rows: number }[]> {
  const md = await readFile(
    join(engagementDir, ...PROPOSALS_DIR.split("/"), proposalName),
    "utf8",
  );
  const out: { anchor: string; rows: number }[] = [];
  for (const t of parseAnchoredTables(md)) out.push({ anchor: t.anchor.name, rows: t.rows.length });
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = PROPOSE_RE.exec(lines[i]!);
    if (!m) continue;
    let j = i + 1;
    while (j < lines.length && !lines[j]!.trim().startsWith("|")) j++;
    let n = 0;
    for (let k = j + 2; k < lines.length && lines[k]!.trim().startsWith("|"); k++) n++;
    out.push({ anchor: m[2]!, rows: n });
  }
  return out;
}
