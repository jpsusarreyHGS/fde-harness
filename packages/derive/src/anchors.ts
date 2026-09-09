/**
 * Anchor-driven markdown table parsing.
 *
 * Every table in an engagement instrument carries an HTML-comment anchor
 * immediately above it:
 *
 *   <!-- table:observation-log.rows role=register id=Id -->
 *   <!-- table:stakeholder-map.labour role=kv -->
 *   <!-- table:autonomy-ladder.rungs role=labels key=Rung -->
 *
 * Anchors, not headings, identify tables. A heading can be reworded without
 * breaking the parse; renaming an anchor is a deliberate schema change.
 *
 * Only `role=register` tables contribute counts to derived state.
 */

export type TableRole = "register" | "kv" | "labels";

export interface TableAnchor {
  /** Full anchor name, e.g. "observation-log.rows" */
  name: string;
  /** Instrument part, e.g. "observation-log" */
  instrument: string;
  /** Table part, e.g. "rows" */
  table: string;
  role: TableRole;
  /** `id=` for register tables — the key column */
  idColumn?: string;
  /** `key=` for labels tables — the fixed-dimension column */
  keyColumn?: string;
  /**
   * `answer=` for labels tables — the column an FDE fills in.
   *
   * A labels table's rows are schema, not data, so counting rows says
   * nothing. Counting filled answers says everything.
   */
  answerColumn?: string;
  /** 1-based line number of the anchor, for error messages */
  line: number;
}

export interface ParsedTable {
  anchor: TableAnchor;
  headers: string[];
  /** One object per data row, keyed by header. Separator row excluded. */
  rows: Record<string, string>[];
}

const ANCHOR_RE =
  /^[ \t]*<!--[ \t]*table:([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)[ \t]+role=(register|kv|labels)([^>]*?)-->[ \t]*$/;

const ROLES: ReadonlySet<string> = new Set(["register", "kv", "labels"]);

/** A markdown table separator, e.g. `|---|---|` or `| :--- | ---: |` */
function isSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  return /^\|(?:[ \t]*:?-{1,}:?[ \t]*\|)+$/.test(t);
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

/**
 * Split a markdown table row into cells.
 *
 * Escaped pipes (`\|`) are literal content, not delimiters — the exception
 * register's "Rule, verbatim" column can legitimately contain one.
 */
export function splitRow(line: string): string[] {
  const t = line.trim();
  const cells: string[] = [];
  let cur = "";
  let i = t.startsWith("|") ? 1 : 0;
  const end = t.endsWith("|") ? t.length - 1 : t.length;
  for (; i < end; i++) {
    const ch = t[i]!;
    if (ch === "\\" && t[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseAttrs(rest: string): {
  idColumn?: string;
  keyColumn?: string;
  answerColumn?: string;
} {
  const out: { idColumn?: string; keyColumn?: string; answerColumn?: string } = {};
  const id = /\bid=([^\s>]+(?:[ \t]+[^\s=>]+)*?)(?=[ \t]+\w+=|[ \t]*$)/.exec(rest);
  if (id?.[1]) out.idColumn = id[1].trim();
  const key = /\bkey=([^\s>]+(?:[ \t]+[^\s=>]+)*?)(?=[ \t]+\w+=|[ \t]*$)/.exec(rest);
  if (key?.[1]) out.keyColumn = key[1].trim();
  const ans = /\banswer=([^\s>]+(?:[ \t]+[^\s=>]+)*?)(?=[ \t]+\w+=|[ \t]*$)/.exec(rest);
  if (ans?.[1]) out.answerColumn = ans[1].trim();
  return out;
}

/**
 * Extract every anchored table from a markdown document.
 *
 * Unanchored tables are ignored by design: an instrument holds prose tables
 * and illustrative examples that must never reach derived state.
 */
export function parseAnchoredTables(markdown: string): ParsedTable[] {
  const lines = markdown.split(/\r?\n/);
  const out: ParsedTable[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = ANCHOR_RE.exec(lines[i]!);
    if (!m) continue;

    const instrument = m[1]!;
    const table = m[2]!;
    const role = m[3]!;
    const rest = m[4] ?? "";
    if (!ROLES.has(role)) continue;

    const anchor: TableAnchor = {
      name: `${instrument}.${table}`,
      instrument,
      table,
      role: role as TableRole,
      line: i + 1,
      ...parseAttrs(rest),
    };

    // Walk forward past blank lines and prose to the next table header.
    // Stop at the next anchor — an anchor with no table is a defect, not a
    // reason to attach the following anchor's table to this one.
    let j = i + 1;
    while (j < lines.length && !isTableRow(lines[j]!)) {
      if (ANCHOR_RE.test(lines[j]!)) break;
      j++;
    }
    if (j >= lines.length || !isTableRow(lines[j]!)) continue;
    if (j + 1 >= lines.length || !isSeparator(lines[j + 1]!)) continue;

    const headers = splitRow(lines[j]!);
    const rows: Record<string, string>[] = [];
    let k = j + 2;
    for (; k < lines.length && isTableRow(lines[k]!); k++) {
      if (isSeparator(lines[k]!)) continue;
      const cells = splitRow(lines[k]!);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = cells[idx] ?? "";
      });
      rows.push(row);
    }

    out.push({ anchor, headers, rows });
    i = k - 1;
  }

  return out;
}

/**
 * Rows that carry actual data.
 *
 * A template ships its register tables empty, but an FDE editing by hand can
 * leave a row of empty cells behind. Treat a row whose cells are all blank
 * (or placeholder dashes) as absent, so a stray `| | | |` never inflates a
 * count. This is the safeguard behind "a fresh engagement derives all-zero".
 */
export function dataRows(t: ParsedTable): Record<string, string>[] {
  return t.rows.filter((r) =>
    Object.values(r).some((v) => {
      const s = v.trim();
      return s !== "" && s !== "-" && s !== "—" && s !== "n/a";
    }),
  );
}

/** Register rows only — what derived counts are allowed to see. */
export function registerRows(tables: ParsedTable[]): Record<string, string>[] {
  return tables
    .filter((t) => t.anchor.role === "register")
    .flatMap((t) => dataRows(t));
}

/** Look up one anchored table by its full name. */
export function findTable(
  tables: ParsedTable[],
  name: string,
): ParsedTable | undefined {
  return tables.find((t) => t.anchor.name === name);
}

/**
 * Rows of a labels table whose answer column is filled.
 *
 * This is what "populated" means for a table whose rows are fixed: the six
 * evidence terms, the seven sponsor questions, the five gate criteria.
 */
export function answeredRows(t: ParsedTable): Record<string, string>[] {
  const col = t.anchor.answerColumn;
  if (!col) return [];
  return t.rows.filter((r) => {
    const v = (r[col] ?? "").trim();
    return v !== "" && v !== "-" && v !== "\u2014" && v !== "n/a";
  });
}
