/**
 * The judgment chain: counts and audit.
 *
 *   map → grid → spec → build → eval → claim
 *
 * In harness objects:
 *   observation (EV-) → exception (EX-) → requirement (REQ-)
 *     → allocation (AL-) → ontology object → competency question (CQ-)
 *     → eval case → claim
 *
 * The audit is the reason this package exists. Dangling citations, orphan
 * evidence and unsourced requirements are defects that markdown cannot
 * detect and a reviewer will not reliably catch by eye.
 */

import { dataRows, findTable, type ParsedTable } from "./anchors.ts";

export interface ChainCounts {
  evidence: {
    total: number;
    observed: number;
    system: number;
    documented: number;
    stated: number;
  };
  exceptions: { total: number; withRuleHolder: number; quantified: number };
  requirements: {
    total: number;
    sourced: number;
    verified: number;
    unverified: number;
    assumption: number;
    withAC: number;
  };
  allocations: {
    total: number;
    withReason: number;
    deterministic: number;
    modelJudgement: number;
    humanGate: number;
    leaveAlone: number;
  };
  ontologyObjects: { promoted: number; backlog: number };
  competencyQuestions: {
    total: number;
    answerable: number;
    needsData: number;
    notModelled: number;
  };
  evalCases: { total: number; passing: number; failing: number; p0: number };
  audit: ChainAudit;
}

export interface AuditFinding {
  kind:
    | "unsourced-requirement"
    | "orphan-evidence"
    | "dangling-citation"
    | "stale-unverified"
    | "unowned-assumption"
    | "allocation-without-reason"
    | "exception-without-rule-holder";
  /** The id the finding is about, e.g. "REQ-014". */
  id: string;
  /** Where to look. */
  location: string;
  detail: string;
}

export interface ChainAudit {
  unsourcedRequirements: number;
  orphanEvidence: number;
  danglingCitations: number;
  staleUnverified: number;
  unownedAssumptions: number;
  allocationsWithoutReason: number;
  exceptionsWithoutRuleHolder: number;
  /** Every finding, with a location. A count with no location is not actionable. */
  findings: AuditFinding[];
}

const ID_RE = /\b((?:EV|EX|REQ|AL|CQ|Q)-\d+)\b/g;

/** Extract every harness id from a cell. `Source` cells hold lists. */
export function extractIds(cell: string): string[] {
  const out: string[] = [];
  for (const m of cell.matchAll(ID_RE)) out.push(m[1]!);
  return out;
}

/**
 * A cell counts as filled only if it holds real content.
 *
 * Template placeholder text is not content. A `Source` cell still reading
 * `EV- / EX-` is an unfilled cell wearing a filled cell's clothes, and
 * treating it as sourced would defeat the whole audit.
 */
export function filled(cell: string | undefined): boolean {
  if (cell === undefined) return false;
  const s = cell.trim();
  if (s === "" || s === "-" || s === "—" || s === "n/a") return false;
  // bare prefixes left over from the template
  if (/^(EV|EX|REQ|AL|CQ|Q)-?(\s*[/,]\s*(EV|EX|REQ|AL|CQ|Q)-?)*$/.test(s)) return false;
  if (/^""$/.test(s)) return false;
  // An option list is placeholder text, not a value. Templates document
  // choices in prose and ship the cell empty, but a hand-edited file can
  // still carry "READY · READY WITH CAVEATS · NOT READY" — reading that as a
  // decision would silently fabricate a gate verdict.
  if (s.includes("\u00b7")) return false;
  if (s.split(/\s+\/\s+/).length >= 3) return false;
  return true;
}

/** Pick the first present column from a list of candidate headers. */
function col(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const v = row[n];
    if (v !== undefined) return v;
  }
  return "";
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-");
}

export interface ChainInput {
  /** instrument id -> its parsed anchored tables */
  tables: Map<string, ParsedTable[]>;
  /** Eval case counts, sourced from 06-Evals/golden-sets and runs. */
  evalCases?: { total: number; passing: number; failing: number; p0: number };
}

export function deriveChain(input: ChainInput): ChainCounts {
  const { tables } = input;
  const findings: AuditFinding[] = [];

  const rowsOf = (instrument: string, table: string) => {
    const ts = tables.get(instrument);
    if (!ts) return [];
    const t = findTable(ts, table);
    return t ? dataRows(t) : [];
  };

  // ---- evidence -----------------------------------------------------------
  const evRows = rowsOf("observation-log", "observation-log.rows");
  const evidence = {
    total: evRows.length,
    observed: 0,
    system: 0,
    documented: 0,
    stated: 0,
  };
  const evidenceIds = new Set<string>();
  for (const r of evRows) {
    const id = col(r, "Id").trim();
    if (id) evidenceIds.add(id);
    switch (norm(col(r, "Class"))) {
      case "observed": evidence.observed++; break;
      case "system": evidence.system++; break;
      case "documented": evidence.documented++; break;
      case "stated": evidence.stated++; break;
    }
  }

  // ---- exceptions ---------------------------------------------------------
  const exRows = rowsOf("exception-register", "exception-register.rows");
  let withRuleHolder = 0;
  let quantified = 0;
  const exceptionIds = new Set<string>();
  for (const r of exRows) {
    const id = col(r, "Id").trim();
    if (id) exceptionIds.add(id);
    const holder = col(r, "Rule holder (role)", "Rule holder");
    if (filled(holder)) withRuleHolder++;
    else if (id) {
      findings.push({
        kind: "exception-without-rule-holder",
        id,
        location: "02-Workflow/exception-register.md",
        detail: "No rule holder named. This is the ceiling on eval quality — raise a Q-.",
      });
    }
    // "a rate with a window, or the literal string unquantified"
    const freq = col(r, "Frequency").trim();
    if (filled(freq) && norm(freq) !== "unquantified") quantified++;
  }

  // ---- requirements -------------------------------------------------------
  const reqRows = rowsOf("requirements-register", "requirements-register.rows");
  const requirements = {
    total: reqRows.length,
    sourced: 0,
    verified: 0,
    unverified: 0,
    assumption: 0,
    withAC: 0,
  };
  for (const r of reqRows) {
    const id = col(r, "Id").trim();
    const source = col(r, "Source");
    const conf = col(r, "Confidence").trim();

    if (filled(source)) {
      requirements.sourced++;
      // dangling citation: a cited id that does not exist upstream
      for (const cited of extractIds(source)) {
        const known =
          (cited.startsWith("EV-") && evidenceIds.has(cited)) ||
          (cited.startsWith("EX-") && exceptionIds.has(cited));
        if (!known) {
          findings.push({
            kind: "dangling-citation",
            id: id || "(unnamed requirement)",
            location: "02-Workflow/requirements-register.md",
            detail: `Source cites ${cited}, which does not exist. Usually a renumbering that should never have happened.`,
          });
        }
      }
    } else if (conf.toUpperCase() !== "ASSUMPTION") {
      findings.push({
        kind: "unsourced-requirement",
        id: id || "(unnamed requirement)",
        location: "02-Workflow/requirements-register.md",
        detail: "No Source. Route to open-questions.md, or tag ASSUMPTION with a named owner.",
      });
    }

    if (conf === "UNVERIFIED") requirements.unverified++;
    else if (conf.toUpperCase() === "ASSUMPTION") requirements.assumption++;
    else if (norm(conf) === "verified") requirements.verified++;

    if (filled(col(r, "Acceptance criteria"))) requirements.withAC++;
  }

  // orphan evidence: captured but cited nowhere
  const citedIds = new Set<string>();
  for (const r of reqRows) for (const c of extractIds(col(r, "Source"))) citedIds.add(c);
  for (const r of rowsOf("exception-register", "exception-register.rows")) {
    for (const c of extractIds(col(r, "Source"))) citedIds.add(c);
  }
  for (const ev of evidenceIds) {
    if (!citedIds.has(ev)) {
      findings.push({
        kind: "orphan-evidence",
        id: ev,
        location: "02-Workflow/observation-log.md",
        detail: "Captured but cited nowhere. Either a gap in the analysis, or the observation was not needed.",
      });
    }
  }

  // unowned assumptions
  for (const r of rowsOf("requirements-register", "requirements-register.assumptions")) {
    const id = col(r, "Req id").trim();
    if (!filled(col(r, "Owner")) || !filled(col(r, "Confirm by"))) {
      findings.push({
        kind: "unowned-assumption",
        id: id || "(unnamed assumption)",
        location: "02-Workflow/requirements-register.md",
        detail: "An assumption with no owner or no confirm-by date is a guess with a permanent home.",
      });
    }
  }

  // ---- allocations --------------------------------------------------------
  const alRows = rowsOf("allocation-grid", "allocation-grid.rows");
  const allocations = {
    total: alRows.length,
    withReason: 0,
    deterministic: 0,
    modelJudgement: 0,
    humanGate: 0,
    leaveAlone: 0,
  };
  for (const r of alRows) {
    const id = col(r, "Id").trim();
    const reason = col(r, "Reason", "**Reason**");
    // "makes sense" is not a reason — require substance
    if (filled(reason) && reason.trim().length >= 12) allocations.withReason++;
    else {
      findings.push({
        kind: "allocation-without-reason",
        id: id || "(unnamed allocation)",
        location: "04-Placement/allocation-grid.md",
        detail: "The reason is the artefact. An allocation without one will not survive challenge at G2.",
      });
    }
    switch (norm(col(r, "Category"))) {
      case "deterministic": allocations.deterministic++; break;
      case "model-judgement": case "model-judgment": allocations.modelJudgement++; break;
      case "human-gate": allocations.humanGate++; break;
      case "leave-alone": allocations.leaveAlone++; break;
    }
  }

  // ---- ontology + competency questions ------------------------------------
  const ontologyObjects = {
    promoted: rowsOf("promotion-log", "promotion-log.rows").length,
    backlog: rowsOf("ontology-backlog", "ontology-backlog.rows").length,
  };

  const cqRows = rowsOf("competency-questions", "competency-questions.rows");
  const competencyQuestions = {
    total: cqRows.length,
    answerable: 0,
    needsData: 0,
    notModelled: 0,
  };
  for (const r of cqRows) {
    switch (norm(col(r, "Status"))) {
      case "answerable": competencyQuestions.answerable++; break;
      case "needs-data": competencyQuestions.needsData++; break;
      case "not-modelled": case "not-modeled": competencyQuestions.notModelled++; break;
    }
  }

  // ---- stale UNVERIFIED ---------------------------------------------------
  // A stated-only requirement that has reached build is the class that
  // surfaces at UAT. Flagged whenever anything has been allocated.
  if (allocations.total > 0) {
    for (const r of reqRows) {
      if (col(r, "Confidence").trim() === "UNVERIFIED") {
        findings.push({
          kind: "stale-unverified",
          id: col(r, "Id").trim() || "(unnamed requirement)",
          location: "02-Workflow/requirements-register.md",
          detail: "Stated-only evidence, and placement has begun. Verify before build.",
        });
      }
    }
  }

  const count = (k: AuditFinding["kind"]) => findings.filter((f) => f.kind === k).length;

  return {
    evidence,
    exceptions: { total: exRows.length, withRuleHolder, quantified },
    requirements,
    allocations,
    ontologyObjects,
    competencyQuestions,
    evalCases: input.evalCases ?? { total: 0, passing: 0, failing: 0, p0: 0 },
    audit: {
      unsourcedRequirements: count("unsourced-requirement"),
      orphanEvidence: count("orphan-evidence"),
      danglingCitations: count("dangling-citation"),
      staleUnverified: count("stale-unverified"),
      unownedAssumptions: count("unowned-assumption"),
      allocationsWithoutReason: count("allocation-without-reason"),
      exceptionsWithoutRuleHolder: count("exception-without-rule-holder"),
      findings,
    },
  };
}
