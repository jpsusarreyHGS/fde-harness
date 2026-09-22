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
  return (await tableInfo(engagementDir, instrumentPath, anchorName)).headers;
}

export interface TableInfo {
  headers: string[];
  role: "register" | "kv" | "labels";
  /** The column a fill is keyed on — `key=` for labels, the first column for kv. */
  keyColumn: string;
  /** The column an FDE fills in a labels table; the second column of a kv. */
  answerColumn: string | null;
  /** The key values the table ships with, cleaned of markup. */
  keys: string[];
}

/**
 * Everything a caller needs to build a row — or a fill — for an anchored table.
 *
 * `tableColumns` was enough while only register tables were writable. A fill
 * against a labels table also needs the key column and the keys that exist,
 * because a fill keyed on a role the template does not have is a row that
 * silently goes nowhere.
 */
export async function tableInfo(
  engagementDir: string,
  instrumentPath: string,
  anchorName: string,
): Promise<TableInfo> {
  const md = await readFile(join(engagementDir, ...instrumentPath.split("/")), "utf8");
  const t = parseAnchoredTables(md).find((x) => x.anchor.name === anchorName);
  if (!t) throw new WriteRefused(`no anchored table ${anchorName} in ${instrumentPath}`);
  const keyColumn = t.anchor.keyColumn ?? t.headers[0] ?? "";
  const answerColumn =
    t.anchor.answerColumn ?? (t.anchor.role === "kv" ? (t.headers[1] ?? null) : null);
  return {
    headers: t.headers,
    role: t.anchor.role,
    keyColumn,
    answerColumn,
    keys: t.rows.map((r) => cleanKey(r[keyColumn] ?? "")).filter(Boolean),
  };
}

/**
 * Templates write keys as `**The exception holder**`. A fill written as
 * "Exception holder" must still land on that row, so both sides are compared
 * without markup, without the article, and without case.
 */
export function cleanKey(raw: string): string {
  return raw.replace(/[*_`]/g, "").trim().replace(/^the\s+/i, "").toLowerCase();
}

function blankCell(v: string): boolean {
  const s = v.trim();
  return s === "" || s === "-" || s === "—" || s === "n/a";
}

/**
 * Fill cells in a labels or kv table.
 *
 * The five roles, the sponsor's seven questions and the evidence-handling
 * terms are labels tables: their rows are the schema, and until now nothing
 * could write into them except a person editing markdown. So a transcript
 * naming the exception holder had nowhere to land, and the coach asked for a
 * name the harness had already read.
 *
 * A fill names a key row and sets other cells on it. It **never adds a row**,
 * and it **never overwrites** a cell that already holds a different value —
 * that is a decision someone made, and undoing it belongs in an editor with a
 * person at the keyboard, not in an accept.
 */
export async function fillCells(
  engagementDir: string,
  instrumentPath: string,
  anchorName: string,
  rows: Record<string, string>[],
): Promise<AppendResult> {
  if (rows.length === 0) return { written: 0, anchor: anchorName, atLine: 0 };

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
  if (table.anchor.role === "register") {
    throw new WriteRefused(
      `${anchorName} is role=register. A fill is for labels and kv tables; append rows to a register instead.`,
      { anchor: anchorName },
    );
  }

  const headers = table.headers;
  const keyColumn = table.anchor.keyColumn ?? headers[0]!;
  const lines = md.split(/\r?\n/);
  let i = table.anchor.line - 1;
  while (i < lines.length && !lines[i]!.trim().startsWith("|")) i++;
  const headerLine = i;
  const onDisk = splitRow(lines[headerLine] ?? "");
  if (onDisk.join("|") !== headers.join("|")) {
    throw new WriteRefused(
      `${anchorName}: header on disk does not match the parsed header. Refusing to write into a table that moved under us.`,
      { anchor: anchorName },
    );
  }

  // Row line numbers, keyed on the cleaned key — the same normalisation the
  // caller's key will get, so `Exception holder` finds `**The exception holder**`.
  const lineOfKey = new Map<string, number>();
  for (let j = headerLine + 2; j < lines.length && lines[j]!.trim().startsWith("|"); j++) {
    const cells = splitRow(lines[j]!);
    const k = cleanKey(cells[headers.indexOf(keyColumn)] ?? "");
    if (k && !lineOfKey.has(k)) lineOfKey.set(k, j);
  }

  let touched = 0;
  let firstLine = 0;
  rows.forEach((r, idx) => {
    for (const k of Object.keys(r)) {
      if (!headers.includes(k)) {
        throw new WriteRefused(
          `fill ${idx + 1}: "${k}" is not a column of ${anchorName}. Columns are: ${headers.join(", ")}`,
          { anchor: anchorName, column: k, row: idx + 1 },
        );
      }
    }
    const key = cleanKey(r[keyColumn] ?? "");
    if (!key) {
      throw new WriteRefused(
        `fill ${idx + 1}: no "${keyColumn}" — a fill names the row it lands on.`,
        { anchor: anchorName, column: keyColumn, row: idx + 1 },
      );
    }
    const at = lineOfKey.get(key);
    if (at === undefined) {
      throw new WriteRefused(
        `fill ${idx + 1}: ${anchorName} has no row "${r[keyColumn]}". A fill never adds a row. Its keys are: ${[...lineOfKey.keys()].join(" | ")}`,
        { anchor: anchorName, column: keyColumn, row: idx + 1 },
      );
    }
    const cells = splitRow(lines[at]!);
    while (cells.length < headers.length) cells.push("");
    let changed = false;
    for (const [col, raw] of Object.entries(r)) {
      if (col === keyColumn) continue;
      const value = escapeCell(raw);
      if (value === "") continue;
      const ci = headers.indexOf(col);
      const current = cells[ci] ?? "";
      if (blankCell(current)) {
        cells[ci] = value;
        changed = true;
      } else if (current.trim() !== value) {
        throw new WriteRefused(
          `fill ${idx + 1}: ${anchorName} "${r[keyColumn]}" already holds "${current.trim()}" in ${col}. ` +
            "A fill never overwrites — if that value is wrong, change it in the file deliberately.",
          { anchor: anchorName, column: col, row: idx + 1 },
        );
      }
    }
    if (changed) {
      lines[at] = `| ${cells.join(" | ")} |`;
      touched++;
      if (!firstLine) firstLine = at + 1;
    }
  });

  if (touched) await writeFile(abs, lines.join("\n"), "utf8");
  return { written: touched, anchor: anchorName, atLine: firstLine };
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
