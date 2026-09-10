/**
 * Id allocation.
 *
 * Ids were assigned by whoever was editing the file — an FDE reading to the
 * bottom of a register, or an LLM doing the same. That is a read-then-write
 * race, and the harness's own answer to the collisions it causes was
 * after-the-fact detection: `chain.ts` describes a dangling citation as
 * "usually a renumbering that should never have happened."
 *
 * Prevention beats detection. Code mints ids now.
 *
 * The rule that makes this non-trivial: ids are **append-only and never
 * reused, even after a row is deleted**, and a deleted row is struck through
 * rather than removed. So the next id is `max(seen) + 1`, not `count + 1`,
 * and `max` must include struck-through rows.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseAnchoredTables } from "./anchors.ts";

export type IdPrefix = "EV" | "EX" | "REQ" | "AL" | "CQ" | "Q";

/** Where each prefix's ids live. One file owns each sequence. */
const HOME: Record<IdPrefix, { path: string; width: number }> = {
  EV:  { path: "02-Workflow/observation-log.md",       width: 3 },
  EX:  { path: "02-Workflow/exception-register.md",    width: 3 },
  REQ: { path: "02-Workflow/requirements-register.md", width: 3 },
  Q:   { path: "02-Workflow/open-questions.md",        width: 3 },
  AL:  { path: "04-Placement/allocation-grid.md",      width: 3 },
  CQ:  { path: "03-Systems/ontology/competency-questions.md", width: 2 },
};

/**
 * Every id of this prefix anywhere in the file, struck-through included.
 *
 * Scans the raw text rather than parsed rows on purpose: a struck-through row
 * (`~~EV-014~~ withdrawn — duplicate`) may no longer parse as a data row, and
 * missing it would let the next mint reuse a retired id.
 */
export function scanIds(markdown: string, prefix: IdPrefix): number[] {
  const re = new RegExp(`\\b${prefix}-(\\d+)\\b`, "g");
  const out: number[] = [];
  for (const m of markdown.matchAll(re)) out.push(Number(m[1]));
  return out.filter((n) => Number.isFinite(n));
}

export interface MintResult {
  ids: string[];
  /** Highest number already present, so a caller can report what it grew from. */
  previousMax: number;
}

/**
 * Mint `count` contiguous ids for `prefix` in an engagement.
 *
 * Reads the owning file, takes `max(seen) + 1`, and returns formatted ids.
 * The caller writes them in the same operation — see `writer.ts` — so the
 * window between read and write is one function call rather than a whole
 * agent turn.
 */
export async function mintIds(
  engagementDir: string,
  prefix: IdPrefix,
  count: number,
): Promise<MintResult> {
  if (count < 0) throw new Error(`cannot mint ${count} ids`);
  const home = HOME[prefix];
  let md = "";
  try {
    md = await readFile(join(engagementDir, ...home.path.split("/")), "utf8");
  } catch {
    // No file yet: the sequence starts at 1. `/init-engagement` normally
    // creates it, so this is a first-run path, not an error.
  }
  const seen = scanIds(md, prefix);
  const previousMax = seen.length ? Math.max(...seen) : 0;
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push(`${prefix}-${String(previousMax + i).padStart(home.width, "0")}`);
  }
  return { ids, previousMax };
}

/**
 * Every id currently defined in the engagement, by prefix.
 *
 * Used to resolve a proposal's citations against reality before anything is
 * written — an extraction that cites `EV-099` should be caught at propose
 * time, not by the audit three days later.
 */
export async function knownIds(
  engagementDir: string,
): Promise<Map<IdPrefix, Set<string>>> {
  const out = new Map<IdPrefix, Set<string>>();
  for (const prefix of Object.keys(HOME) as IdPrefix[]) {
    const home = HOME[prefix];
    let md = "";
    try {
      md = await readFile(join(engagementDir, ...home.path.split("/")), "utf8");
    } catch {
      out.set(prefix, new Set());
      continue;
    }
    // Only ids that actually key a row count as defined. An id merely
    // mentioned in prose or cited in a Source column is not a definition.
    const defined = new Set<string>();
    for (const t of parseAnchoredTables(md)) {
      if (t.anchor.role !== "register") continue;
      const key = t.anchor.idColumn;
      if (!key) continue;
      for (const r of t.rows) {
        const v = (r[key] ?? "").trim().replace(/~~/g, "");
        if (new RegExp(`^${prefix}-\\d+$`).test(v)) defined.add(v);
      }
    }
    out.set(prefix, defined);
  }
  return out;
}

/** The file that owns a prefix's sequence. */
export function homeOf(prefix: IdPrefix): string {
  return HOME[prefix].path;
}

/**
 * The prefix an instrument mints, if it mints one.
 *
 * Asked by anything that has to tell an agent whether to leave a key column
 * blank. Inferring it from the first existing row looked equivalent and was
 * not: on a fresh engagement every register is empty, so every key column
 * reads as one the FDE supplies — which is exactly the wrong instruction at
 * exactly the moment it is followed.
 */
export function prefixMintedBy(instrumentPath: string): IdPrefix | null {
  for (const prefix of Object.keys(HOME) as IdPrefix[]) {
    if (HOME[prefix].path === instrumentPath) return prefix;
  }
  return null;
}
