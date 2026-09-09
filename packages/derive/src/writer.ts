/**
 * Writing rows into an instrument.
 *
 * Before this, nothing in the harness could append a register row. Every
 * writer was an LLM rewriting a markdown table by hand, with no schema check
 * at write time and no id allocator — which is precisely why `chain.ts`
 * exists, to detect after the fact what the write path failed to prevent.
 *
 * This validates against the anchor's own header row and refuses anything
 * that does not fit, so a malformed row cannot reach the register at all.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseAnchoredTables, splitRow } from "./anchors.ts";

export interface AppendResult {
  written: number;
  /** The anchor written to, for the caller's log. */
  anchor: string;
  /** Line the first new row landed on, 1-based. */
  atLine: number;
}

export interface RefusalDetail {
  instrument?: string;
  anchor?: string;
  column?: string;
  row?: number;
}

export class WriteRefused extends Error {
  // Assigned in the body rather than declared as a parameter property:
  // Node's strip-only TypeScript mode rejects those, because they emit code
  // rather than only erasing types. Worth knowing for the whole package —
  // no parameter properties, no enums, no namespaces, no decorators.
  readonly detail: RefusalDetail | undefined;

  constructor(message: string, detail?: RefusalDetail) {
    super(message);
    this.name = "WriteRefused";
    this.detail = detail;
  }
}

/** Markdown-safe cell text: pipes escaped, newlines flattened. */
export function escapeCell(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

/**
 * Append rows to an anchored table.
 *
 * `rows` are objects keyed by column header. Every key must be a real column;
 * a typo silently landing in the wrong cell is exactly the class of defect
 * the audit was built to catch, so it is refused here instead.
 *
 * Missing columns are written blank — a partially-known row is legitimate and
 * the audit will surface what it lacks.
 */
export async function appendRows(
  engagementDir: string,
  instrumentPath: string,
  anchorName: string,
  rows: Record<string, string>[],
): Promise<AppendResult> {
  if (rows.length === 0) {
    return { written: 0, anchor: anchorName, atLine: 0 };
  }

  const abs = join(engagementDir, ...instrumentPath.split("/"));
  let md: string;
  try {
    md = await readFile(abs, "utf8");
  } catch {
    throw new WriteRefused(
      `${instrumentPath} does not exist. Run /init-engagement before writing to it.`,
      { anchor: anchorName },
    );
  }

  const table = parseAnchoredTables(md).find((t) => t.anchor.name === anchorName);
  if (!table) {
    throw new WriteRefused(
      `no anchored table ${anchorName} in ${instrumentPath}. Anchors are the schema — do not write to an unanchored table.`,
      { anchor: anchorName },
    );
  }
  if (table.anchor.role !== "register") {
    throw new WriteRefused(
      `${anchorName} is role=${table.anchor.role}. Only register tables take appended rows; a labels table's rows are schema.`,
      { anchor: anchorName },
    );
  }

  const headers = table.headers;
  rows.forEach((r, i) => {
    for (const k of Object.keys(r)) {
      if (!headers.includes(k)) {
        throw new WriteRefused(
          `row ${i + 1}: "${k}" is not a column of ${anchorName}. Columns are: ${headers.join(", ")}`,
          { anchor: anchorName, column: k, row: i + 1 },
        );
      }
    }
  });

  // Locate the table in the source so the insert point is exact. The parser
  // gives us the anchor's line; walk to the separator, then past any rows.
  const lines = md.split(/\r?\n/);
  let i = table.anchor.line - 1;
  while (i < lines.length && !lines[i]!.trim().startsWith("|")) i++;
  const headerLine = i;
  let j = headerLine + 2; // past header and separator
  while (j < lines.length && lines[j]!.trim().startsWith("|")) j++;

  // Guard against a header that has drifted from what the parser saw.
  const onDisk = splitRow(lines[headerLine] ?? "");
  if (onDisk.join("|") !== headers.join("|")) {
    throw new WriteRefused(
      `${anchorName}: header on disk does not match the parsed header. Refusing to write into a table that moved under us.`,
      { anchor: anchorName },
    );
  }

  const rendered = rows.map(
    (r) => `| ${headers.map((h) => escapeCell(r[h] ?? "")).join(" | ")} |`,
  );

  lines.splice(j, 0, ...rendered);
  await writeFile(abs, lines.join("\n"), "utf8");

  return { written: rows.length, anchor: anchorName, atLine: j + 1 };
}

/** The columns an anchored table expects, for a caller building rows. */
export async function tableColumns(
  engagementDir: string,
  instrumentPath: string,
  anchorName: string,
): Promise<string[]> {
  const md = await readFile(join(engagementDir, ...instrumentPath.split("/")), "utf8");
  const t = parseAnchoredTables(md).find((x) => x.anchor.name === anchorName);
  if (!t) throw new WriteRefused(`no anchored table ${anchorName} in ${instrumentPath}`);
  return t.headers;
}

/**
 * Strike a row through rather than deleting it.
 *
 * "A deleted row is struck through with a reason, not removed — a citation
 * that dangles is a defect you can find, while a silently renumbered id is
 * one you cannot." Removing the row would also free its id for reuse, which
 * the id rules forbid.
 */
export async function retireRow(
  engagementDir: string,
  instrumentPath: string,
  anchorName: string,
  id: string,
  reason: string,
): Promise<boolean> {
  const abs = join(engagementDir, ...instrumentPath.split("/"));
  const md = await readFile(abs, "utf8");
  const lines = md.split(/\r?\n/);
  const idCell = new RegExp(`^\\|\\s*${id}\\s*\\|`);
  const at = lines.findIndex((l) => idCell.test(l));
  if (at < 0) return false;
  if (lines[at]!.includes("~~")) return false; // already retired
  const cells = splitRow(lines[at]!);
  cells[0] = `~~${cells[0]}~~`;
  const last = cells.length - 1;
  cells[last] = `${cells[last] ?? ""} ~~retired: ${escapeCell(reason)}~~`.trim();
  lines[at] = `| ${cells.join(" | ")} |`;
  await writeFile(abs, lines.join("\n"), "utf8");
  return true;
}
