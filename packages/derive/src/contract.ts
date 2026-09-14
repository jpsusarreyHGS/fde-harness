/**
 * The contract layer, checked before it leaves the harness.
 *
 * `03-Systems/ontology/` is consumed by `jpsusarreyHGS/ontology-compiler`,
 * which refuses to compile past four gaps and says why:
 *
 *   > "These are the harness's own promotion preconditions, enforced at the
 *   > boundary where the contract enters this repo, so a gap is a named
 *   > refusal rather than a half-built instance."
 *
 * They are our preconditions and we were not checking them. An FDE found out
 * at import time, in another repo, in Python, about a gap that was created
 * here weeks earlier. This module moves the discovery back to where the work
 * happened — and routes it through the coach, so the answer is a person to ask
 * rather than an error code.
 *
 * The compiler's own distinction is worth keeping exactly: **thinness is a
 * warning, a missing owner is a refusal.** A competency question with no
 * template yet is progress you can see. A glossary term nobody owns is an
 * unanswered question about who decides.
 */

import { dataRows, findTable, type ParsedTable } from "./anchors.ts";
import { knownIds, idPattern, type IdPrefix } from "./ids.ts";

/** The contract instruments, and whether a compile is meaningless without one. */
export const CONTRACT_INSTRUMENTS = [
  { id: "glossary", file: "03-Systems/ontology/glossary.md", required: true },
  { id: "personas", file: "03-Systems/ontology/personas.md", required: true },
  { id: "competency-questions", file: "03-Systems/ontology/competency-questions.md", required: true },
  { id: "source-systems", file: "03-Systems/ontology/source-systems.md", required: true },
  { id: "entities", file: "03-Systems/ontology/entities.md", required: false },
  { id: "ontology-backlog", file: "03-Systems/ontology/backlog.md", required: false },
  { id: "promotion-log", file: "03-Systems/ontology/promotion-log.md", required: false },
  // Lives in stage 05 and the compiler accepts it from there — it resolves
  // `../../05-Build/spec.md` relative to the contract directory.
  { id: "spec", file: "05-Build/spec.md", required: false },
] as const;

/**
 * Anchors whose absence aborts the parse downstream.
 *
 * Renaming one is a deliberate schema change and has to happen here first —
 * the compiler's message says exactly that.
 */
export const REQUIRED_TABLES = [
  "glossary.terms",
  "personas.permissions",
  "personas.write-allow-list",
  "competency-questions.rows",
  "source-systems.identity-rules",
  "source-systems.field-mappings",
] as const;

export interface ContractFinding {
  severity: "refuse" | "warn";
  /** Stable code, matching the compiler's vocabulary where one exists. */
  code: string;
  /** The row or table this is about. */
  where: string;
  detail: string;
  /** The role that can answer, when a person can. */
  who?: string;
  /** Where to write the answer. */
  location?: string;
}

/**
 * Blank, as the compiler counts it.
 *
 * Deliberately wider than `coach.ts`'s own predicate: the compiler also treats
 * `n/a`, `tbc` and `?` as absent, and a cell that passes here and fails there
 * is the worst kind of disagreement — it reads as the harness having approved
 * something the compiler then rejects.
 */
const BLANK = new Set(["", "-", "—", "n/a", "tbd", "tbc", "?"]);

function blank(v: string | undefined): boolean {
  return BLANK.has((v ?? "").trim().toLowerCase());
}

/**
 * Compare headers the way the compiler does.
 *
 * Its own note: *"Column names are matched on a NORMALIZED form (markdown
 * emphasis stripped, lowercased, punctuation collapsed) so that rewording a
 * header's presentation does not break the parse, while renaming the concept
 * does."* Matching literally here would have meant `**Grain — one row is one
 * what?**` failing a check that the compiler passes — the harness reporting a
 * gap that does not exist, which is worse than missing one.
 */
function normHeader(h: string): string {
  return h
    .replace(/[*_`~]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cell(r: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const v = r[n];
    if (v !== undefined) return v.trim();
  }
  // Then the normalised comparison, so a reworded header still reads.
  const wanted = names.map(normHeader);
  const cols = Object.entries(r).map(([k, v]) => [normHeader(k), v] as const);
  for (const [k, v] of cols) {
    if (wanted.includes(k)) return (v ?? "").trim();
  }
  // Finally the concept name as a leading phrase. The harness writes its own
  // prompt into the header — `**Grain — one row is one what?**` — and the
  // concept is the first word of it. This is how the compiler's per-field list
  // of accepted forms behaves, without restating the list here.
  for (const [k, v] of cols) {
    if (wanted.some((w) => w && (k === w || k.startsWith(`${w} `)))) return (v ?? "").trim();
  }
  return "";
}

function rowsOf(tables: readonly ParsedTable[], anchor: string): Record<string, string>[] {
  const t = findTable(tables as ParsedTable[], anchor);
  return t ? dataRows(t) : [];
}

export interface ContractInput {
  /** Every parsed table across the contract instruments. */
  tables: readonly ParsedTable[];
  /** Which contract files were found on disk. */
  present: ReadonlySet<string>;
  /** Ids that actually key a row, by prefix — from `knownIds`. */
  known: ReadonlyMap<IdPrefix, Set<string>>;
}

const CQ_ID = /^CQ-\d{2,}$/;

/**
 * Check the contract.
 *
 * Refusals first, in the order an FDE can act on them: a missing file before a
 * missing table before a missing cell.
 */
export function checkContract(input: ContractInput): ContractFinding[] {
  const out: ContractFinding[] = [];
  const { tables, present, known } = input;

  // ---- the files ----------------------------------------------------------
  for (const inst of CONTRACT_INSTRUMENTS) {
    if (present.has(inst.file)) continue;
    out.push({
      severity: inst.required ? "refuse" : "warn",
      code: inst.required ? "instrument-missing" : "instrument-absent",
      where: inst.file,
      detail: inst.required
        ? "required — a compile without it is meaningless."
        : "optional, but its content cannot reach the build.",
      location: inst.file,
    });
  }

  // ---- the anchors --------------------------------------------------------
  for (const anchor of REQUIRED_TABLES) {
    if (findTable(tables as ParsedTable[], anchor)) continue;
    out.push({
      severity: "refuse",
      code: "table-missing",
      where: anchor,
      detail:
        "anchored table not found. Anchors are the schema — a renamed anchor " +
        "is a deliberate change and must be made in the templates first.",
    });
  }

  // ---- glossary: a term with no owner or no grain -------------------------
  for (const r of rowsOf(tables, "glossary.terms")) {
    const term = cell(r, "Term");
    if (!term) continue;
    const where = `glossary.terms · ${term}`;
    if (blank(cell(r, "Owner"))) {
      out.push({
        severity: "refuse", code: "term-no-owner", where,
        detail: `"${term}" has no owner. A term nobody owns is an unanswered question about who decides what it means.`,
        who: "Process owner",
        location: "03-Systems/ontology/glossary.md",
      });
    }
    if (blank(cell(r, "Grain"))) {
      out.push({
        severity: "refuse", code: "term-no-grain", where,
        detail: `"${term}" has no grain. One row is one what?`,
        who: "Process owner",
        location: "03-Systems/ontology/glossary.md",
      });
    }
    if (blank(cell(r, "Worked example"))) {
      out.push({
        severity: "warn", code: "term-no-example", where,
        detail: `"${term}" has no worked example — the fastest way to find out two people mean different things.`,
        who: "Operator",
        location: "03-Systems/ontology/glossary.md",
      });
    }
  }

  // ---- competency questions ----------------------------------------------
  const cqRows = rowsOf(tables, "competency-questions.rows");
  if (!cqRows.length) {
    out.push({
      severity: "refuse", code: "no-competency-questions",
      where: "competency-questions.rows",
      detail:
        "none recorded. The competency questions are the ontology's acceptance " +
        "test; without them there is nothing to compile against.",
      who: "Process owner",
      location: "03-Systems/ontology/competency-questions.md",
    });
  }
  const seenCq = new Set<string>();
  for (const r of cqRows) {
    const id = cell(r, "Id");
    const where = `competency-questions.rows · ${id || "(unnamed)"}`;
    if (!CQ_ID.test(id)) {
      out.push({
        severity: "refuse", code: "cq-bad-id", where,
        detail: `${JSON.stringify(id)} is not CQ-NN. Ids are the join key across templates, evals and reports.`,
        location: "03-Systems/ontology/competency-questions.md",
      });
    } else if (seenCq.has(id)) {
      out.push({
        severity: "refuse", code: "cq-duplicate-id", where,
        detail: `${id} appears twice. Two questions cannot share a template name.`,
        location: "03-Systems/ontology/competency-questions.md",
      });
    } else {
      seenCq.add(id);
    }
    if (blank(cell(r, "Question"))) {
      out.push({
        severity: "refuse", code: "cq-no-question", where,
        detail: "no question text.",
        location: "03-Systems/ontology/competency-questions.md",
      });
    }
    if (blank(cell(r, "Asked by"))) {
      out.push({
        severity: "refuse", code: "cq-no-persona", where,
        detail: `${id || "this question"} names nobody who asks it. A question nobody asked is a query we wrote for ourselves.`,
        who: "Process owner",
        location: "03-Systems/ontology/competency-questions.md",
      });
    }
    if (blank(cell(r, "Evidence they ask it"))) {
      out.push({
        severity: "refuse", code: "cq-no-evidence", where,
        detail: `${id || "this question"} has no evidence that anyone asks it. Cite the observation, or cut it.`,
        who: "Operator",
        location: "03-Systems/ontology/competency-questions.md",
      });
    }
    if (blank(cell(r, "Template"))) {
      out.push({
        severity: "warn", code: "cq-no-template", where,
        detail: `${id || "this question"} has no template yet — visible progress, not a defect.`,
        location: "03-Systems/ontology/competency-questions.md",
      });
    }
  }

  // ---- the write allow-list ----------------------------------------------
  const perms = rowsOf(tables, "personas.permissions");
  const roleVocab = new Set(
    perms.map((r) => cell(r, "Role").replace(/[*_`]/g, "").trim().toLowerCase()).filter(Boolean),
  );
  if (!perms.length) {
    out.push({
      severity: "refuse", code: "no-permission-matrix",
      where: "personas.permissions",
      detail: "no permission matrix. The matrix is the role vocabulary every write is checked against.",
      who: "Security owner",
      location: "03-Systems/ontology/personas.md",
    });
  }
  for (const r of rowsOf(tables, "personas.write-allow-list")) {
    const name = cell(r, "Write");
    const id = cell(r, "Id");
    const where = `personas.write-allow-list · ${id || name || "(unnamed)"}`;
    if (blank(name)) {
      out.push({
        severity: "refuse", code: "write-no-name", where,
        detail: "a write with no name cannot become a template.",
        location: "03-Systems/ontology/personas.md",
      });
    }
    const approver = cell(r, "Approver");
    if (blank(approver)) {
      out.push({
        severity: "refuse", code: "write-no-approver", where,
        detail: `"${name || id}" has no approver. Nothing writes because it seemed reasonable at runtime.`,
        who: "Security owner",
        location: "03-Systems/ontology/personas.md",
      });
    } else if (
      roleVocab.size &&
      !roleVocab.has(approver.replace(/[*_`]/g, "").trim().toLowerCase()) &&
      !/^requesting role$/i.test(approver.trim())
    ) {
      out.push({
        severity: "warn", code: "approver-unknown-role", where,
        detail: `approver "${approver}" is not in the permission matrix, which is the role vocabulary.`,
        who: "Security owner",
        location: "03-Systems/ontology/personas.md",
      });
    }
    if (blank(cell(r, "Object"))) {
      out.push({
        severity: "warn", code: "write-no-object", where,
        detail: `"${name || id}" does not say what it writes to.`,
        location: "03-Systems/ontology/personas.md",
      });
    }
  }

  // ---- entities: a minting system, and a grain ----------------------------
  for (const r of rowsOf(tables, "entities.rows")) {
    const name = cell(r, "Name");
    if (!name) continue;
    const where = `entities.rows · ${name}`;
    if (blank(cell(r, "Minted by"))) {
      out.push({
        severity: "refuse", code: "entity-no-minting-system", where,
        detail: `${name} has no minting system. Which system creates it decides every join built on it.`,
        who: "Systems gatekeeper",
        location: "03-Systems/ontology/entities.md",
      });
    }
    if (blank(cell(r, "Grain"))) {
      out.push({
        severity: "refuse", code: "entity-no-grain", where,
        detail: `${name} has no grain. If it needs an "or", it is two entities.`,
        who: "Process owner",
        location: "03-Systems/ontology/entities.md",
      });
    }
    if (blank(cell(r, "Requirements"))) {
      out.push({
        severity: "warn", code: "entity-no-requirement", where,
        detail: `no requirement cites ${name} — never model from precedent.`,
        who: "Process owner",
        location: "03-Systems/ontology/entities.md",
      });
    }
  }

  for (const r of rowsOf(tables, "source-systems.identity-rules")) {
    const entity = cell(r, "Entity");
    if (!entity) continue;
    const where = `source-systems.identity-rules · ${entity}`;
    if (blank(cell(r, "Minted by"))) {
      out.push({
        severity: "refuse", code: "identity-no-minting-system", where,
        detail: `${entity} has no minting system — ingestion runs in identity order and cannot be derived without it.`,
        who: "Systems gatekeeper",
        location: "03-Systems/ontology/source-systems.md",
      });
    }
    if (blank(cell(r, "Key"))) {
      out.push({
        severity: "refuse", code: "identity-no-key", where,
        detail: `${entity} has no key.`,
        who: "Systems gatekeeper",
        location: "03-Systems/ontology/source-systems.md",
      });
    }
  }

  // ---- citations ----------------------------------------------------------
  // The compiler has no exception register to check against: an `EX-` id
  // reaches a generated dbt filename verbatim, so `EX-001..EX-010` becomes
  // `ex_001_ex_010` and nobody notices. This is the last place it can be
  // caught.
  const defined = new Set<string>();
  for (const s of known.values()) for (const id of s) defined.add(id);
  for (const t of tables) {
    if (t.anchor.role !== "register") continue;
    for (const [i, r] of dataRows(t).entries()) {
      for (const [col, raw] of Object.entries(r)) {
        if (col === t.anchor.idColumn) continue;
        for (const m of (raw ?? "").matchAll(idPattern())) {
          const cited = m[1]!;
          if (defined.has(cited)) continue;
          out.push({
            severity: "refuse",
            code: "dangling-citation",
            where: `${t.anchor.name} row ${i + 1} · ${col}`,
            detail: `cites ${cited}, which does not key any row. Downstream this becomes a filename nobody can trace.`,
            location: t.anchor.instrument,
          });
        }
      }
    }
  }

  return out;
}

/** Load what `checkContract` needs from an engagement on disk. */
export async function readContract(engagementDir: string): Promise<ContractInput> {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { parseAnchoredTables } = await import("./anchors.ts");

  const tables: ParsedTable[] = [];
  const present = new Set<string>();
  for (const inst of CONTRACT_INSTRUMENTS) {
    try {
      const md = await readFile(join(engagementDir, ...inst.file.split("/")), "utf8");
      present.add(inst.file);
      tables.push(...parseAnchoredTables(md));
    } catch {
      // Absent. Reported by `checkContract`, which knows whether it matters.
    }
  }
  return { tables, present, known: await knownIds(engagementDir) };
}
