/**
 * The client-safe pass: what leaves the building, and what does not.
 *
 * `render-deliverables` has always said to check for internal-only material
 * before rendering. It was a reminder, and a trainee's rendered page went
 * out "dropping people's names and describing the constraints" from the
 * calls. A reminder is not a control. This is the control: on by default,
 * with a report an FDE can read in thirty seconds before sending.
 *
 * Four things are removed from body text:
 *
 *   - `Source:` lines and `Source` table columns — provenance is ours
 *   - inline harness ids (`EV-014`, `EX-002`, `Q-007`, `REQ-011`, …)
 *   - named individuals, replaced by their role from the stakeholder map,
 *     unless `00-Setup/client-safe-names.md` lists the name as approved
 *   - anything quoted verbatim from `evidence/observed/`, withheld until
 *     the operator confirms it may go
 *
 * And one thing is always produced: the redaction report — what was removed,
 * from where, and why. When nothing was removed it says so, because a silent
 * pass is indistinguishable from a pass that did not run.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { dataRows, findTable, parseAnchoredTables, splitRow } from "./anchors.ts";
import { idPattern } from "./ids.ts";
import { EVIDENCE_ROOT } from "./intake.ts";

export interface Redaction {
  kind: "source-line" | "source-column" | "citation" | "name" | "observed-quote";
  /** 1-based line in the source markdown. */
  line: number;
  /** What was removed, short enough to scan. */
  what: string;
  why: string;
}

export interface ClientSafeOptions {
  /** Person → role, from the stakeholder map. */
  roles: ReadonlyMap<string, string>;
  /** Names approved to appear, from `00-Setup/client-safe-names.md`. */
  allow: ReadonlySet<string>;
  /** Verbatim lines from `evidence/observed/`, for the quote check. */
  observed?: readonly string[];
  /** Leave ids in the body (`--with-citations`). */
  keepCitations?: boolean;
  /** Leave observed quotes in place (the operator confirmed). */
  keepQuotes?: boolean;
}

export interface ClientSafeResult {
  text: string;
  redactions: Redaction[];
}

const WHY = {
  "source-line": "provenance is internal — a client readout gets the synthesis, not the citations",
  "source-column": "provenance is internal — the column is cleared, the table kept",
  citation: "harness ids mean nothing to a client and point at internal registers",
  name: "a named individual; roles are client-safe, names need the allow-list",
  "observed-quote": "quoted verbatim from a shadowing session — confirm the operator consented before it leaves",
} as const;

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanRole(raw: string): string {
  const r = raw.replace(/[*_`]/g, "").trim().replace(/^the\s+/i, "").toLowerCase();
  return r ? `the ${r}` : "a named individual";
}

function norm(s: string): string {
  return s.replace(/[“”"’']/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function tidy(s: string): string {
  return s
    .replace(/\(\s*(?:,\s*)*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/(\S)\s{2,}(\S)/g, "$1 $2")
    .replace(/\s+—\s*$/g, "")
    .replace(/\|\s*\|/g, "| |")
    .trimEnd();
}

/**
 * Person → role and the allow-list, from the engagement's own files.
 *
 * The five roles and the "other stakeholders" table both name people; the
 * allow-list is a register the operator fills deliberately, one name at a
 * time, with who approved it.
 */
export async function loadNames(engagementDir: string): Promise<{ roles: Map<string, string>; allow: Set<string> }> {
  const roles = new Map<string, string>();
  const allow = new Set<string>();
  try {
    const md = await readFile(join(engagementDir, "01-Organisation", "stakeholder-map.md"), "utf8");
    const tables = parseAnchoredTables(md);
    for (const anchor of ["stakeholder-map.five-roles", "stakeholder-map.others"]) {
      const t = findTable(tables, anchor);
      if (!t) continue;
      for (const r of t.rows) {
        const name = (r["Name"] ?? "").trim();
        const role = (r["Role"] ?? "").trim();
        // "Marta Oyelaran, VP Operations" — the name is before the comma.
        const bare = name.split(",")[0]!.trim();
        if (bare && !/\{\{/.test(bare) && /^[A-ZÀ-Þ]/.test(bare)) roles.set(bare, cleanRole(role));
      }
    }
  } catch { /* no map yet — nothing to replace */ }
  try {
    const md = await readFile(join(engagementDir, "00-Setup", "client-safe-names.md"), "utf8");
    const t = findTable(parseAnchoredTables(md), "client-safe-names.rows");
    if (t) for (const r of dataRows(t)) {
      const n = (r["Name"] ?? "").trim();
      if (n) allow.add(n);
    }
  } catch { /* no allow-list — nobody is approved */ }
  return { roles, allow };
}

/** Lines of the observed evidence, for the verbatim check. */
export async function loadObserved(engagementDir: string): Promise<string[]> {
  const dir = join(engagementDir, ...EVIDENCE_ROOT.split("/"), "observed");
  const out: string[] = [];
  let files: string[];
  try { files = await readdir(dir); } catch { return out; }
  for (const f of files) {
    if (!/\.(md|txt|vtt|srt)$/i.test(f)) continue;
    try {
      const raw = await readFile(join(dir, f), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const s = line.replace(/^\s*>\s*/, "").trim();
        if (s.split(/\s+/).length >= 6) out.push(s);
      }
    } catch { /* unreadable — skip */ }
  }
  return out;
}

/**
 * Run the pass over a markdown document.
 *
 * Line-oriented on purpose: every redaction reports the line it came from,
 * and an FDE checking the report against the source can find each one.
 */
export function clientSafe(markdown: string, o: ClientSafeOptions): ClientSafeResult {
  const redactions: Redaction[] = [];
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];

  // Names: longest first so "Marta Oyelaran" wins over "Marta". Each name
  // also matches on its own tokens of four letters or more — "Oyelaran" and
  // "Marta" alone are still that person.
  const nameRules: { re: RegExp; role: string; name: string }[] = [];
  for (const [name, role] of [...o.roles.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (o.allow.has(name)) continue;
    nameRules.push({ re: new RegExp(`\\b${esc(name)}\\b`, "g"), role, name });
    for (const tok of name.split(/\s+/)) {
      if (tok.length >= 4 && !o.allow.has(tok)) nameRules.push({ re: new RegExp(`\\b${esc(tok)}\\b`, "g"), role, name });
    }
  }

  const observed = (o.observed ?? []).map(norm).filter(Boolean);
  const CITE = idPattern();
  // A run of ids with its connectors — "EV-001, EX-002 and REQ-003" — goes
  // as one unit, so the sentence around it closes cleanly.
  const ID = idPattern().source.replace(/^\\b\(|\)\\b$/g, "");
  const RUN = new RegExp(`\\(?\\b${ID}(?:\\s*(?:,|;|/|&|and|or)\\s*${ID})*\\b\\)?`, "g");

  let sourceCol = -1;
  let sourceColRows = 0;
  let sourceColLine = 0;
  const flushSourceCol = () => {
    if (sourceCol >= 0 && sourceColRows > 0) {
      redactions.push({ kind: "source-column", line: sourceColLine, what: `Source column cleared (${sourceColRows} row${sourceColRows === 1 ? "" : "s"})`, why: WHY["source-column"] });
    }
    sourceCol = -1; sourceColRows = 0;
  };

  lines.forEach((raw, idx) => {
    const n = idx + 1;
    let line = raw;
    const isRow = /^\s*\|/.test(line);

    // Source: lines go entirely.
    if (/^\s*(?:[-*]\s*)?(?:\*\*)?Source(?:\*\*)?\s*:\s*\S/.test(line) && !isRow) {
      redactions.push({ kind: "source-line", line: n, what: line.trim().slice(0, 80), why: WHY["source-line"] });
      return;
    }

    // Tables: a Source column is cleared, the table kept.
    if (isRow) {
      const cells = splitRow(line);
      const isHeader = out.length === 0 || !/^\s*\|/.test(out[out.length - 1] ?? "") || /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[idx + 1] ?? "");
      if (isHeader && /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[idx + 1] ?? "")) {
        flushSourceCol();
        sourceCol = cells.findIndex((c) => /^source$/i.test(c.replace(/[*_`]/g, "").trim()));
        sourceColLine = n;
      } else if (sourceCol >= 0 && !/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line)) {
        if ((cells[sourceCol] ?? "").trim()) {
          cells[sourceCol] = "";
          sourceColRows++;
          line = `| ${cells.join(" | ")} |`;
        }
      }
    } else {
      flushSourceCol();
    }

    // Citations.
    if (!o.keepCitations) {
      const ids = [...line.matchAll(CITE)].map((m) => m[1]!);
      if (ids.length) {
        RUN.lastIndex = 0;
        line = tidy(line.replace(RUN, ""));
        redactions.push({ kind: "citation", line: n, what: [...new Set(ids)].join(", "), why: WHY.citation });
      }
    }

    // Observed quotes.
    if (!o.keepQuotes && observed.length) {
      const spans = [...line.matchAll(/[“"]([^”"]{20,}?)[”"]/g)].map((m) => ({ full: m[0], inner: m[1]! }));
      const bare = line.replace(/^\s*>\s*/, "").trim();
      const candidates = spans.length ? spans : (bare.split(/\s+/).length >= 6 ? [{ full: bare, inner: bare }] : []);
      for (const c of candidates) {
        const key = norm(c.inner);
        if (key.length < 20) continue;
        if (observed.some((ob) => ob.includes(key) || key.includes(ob))) {
          line = line.replace(c.full, "[quotation withheld — confirm before sending]");
          redactions.push({ kind: "observed-quote", line: n, what: `“${c.inner.slice(0, 60)}${c.inner.length > 60 ? "…" : ""}”`, why: WHY["observed-quote"] });
        }
      }
    }

    // Names → roles.
    const seen = new Set<string>();
    for (const rule of nameRules) {
      rule.re.lastIndex = 0;
      if (!rule.re.test(line)) continue;
      line = line.replace(rule.re, rule.role);
      if (!seen.has(rule.name)) {
        seen.add(rule.name);
        redactions.push({ kind: "name", line: n, what: `${rule.name} → ${rule.role}`, why: WHY.name });
      }
    }

    out.push(line);
  });
  flushSourceCol();

  return { text: out.join("\n"), redactions };
}

/** The report, as markdown. Thirty seconds to read; that is the budget. */
export function formatRedactionReport(
  redactions: readonly Redaction[],
  source: string,
  output: string,
  opts: { skipped?: string } = {},
): string {
  const head = [`# Client-safe pass — ${source}`, "", `Rendered to \`${output}\`.`, ""];
  if (opts.skipped) return [...head, `**Client-safe pass skipped — ${opts.skipped}.** Everything in the source is in the page, names and citations included. Do not send this one to a client.`, ""].join("\n");
  if (!redactions.length) return [...head, "**client-safe pass: nothing removed.** No `Source:` lines, no harness ids, no unapproved names, no observed quotes. The page is the source, unchanged.", ""].join("\n");
  const byKind = new Map<string, number>();
  for (const r of redactions) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  const summary = [...byKind.entries()].map(([k, n]) => `${n} ${k.replace(/-/g, " ")}${n === 1 ? "" : "s"}`).join(" · ");
  return [
    ...head,
    `**${redactions.length} item(s) removed** — ${summary}.`,
    "",
    "| Line | Removed | Why |",
    "|---|---|---|",
    ...redactions.map((r) => `| ${r.line} | ${r.what.replace(/\|/g, "\\|")} | ${r.why} |`),
    "",
    "To keep something: add the name to `00-Setup/client-safe-names.md` with who approved it, or re-render with `--with-citations` / `--keep-quotes` / `--internal` and say so in the file name.",
    "",
  ].join("\n");
}
