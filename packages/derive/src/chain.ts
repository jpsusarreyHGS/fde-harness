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
import { ID_ALTERNATION, idPattern } from "./ids.ts";

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
    | "unverified-in-placement"
    | "gap-without-question"
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
  unverifiedInPlacement: number;
  gapsWithoutQuestion: number;
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
 * Expand an id range into the ids it covers.
 *
 * The observation log's session table records an `Ev range` like
 * `EV-001-EV-040`, which cites all forty rows. Treating that as one citation
 * (or none) makes the whole session look uncited.
 */
export function expandRange(cell: string): string[] {
  const m = /\b([A-Z]{2,3})-(\d+)\s*[-–—to]+\s*(?:[A-Z]{2,3}-)?(\d+)\b/.exec(cell);
  if (!m) return extractIds(cell);
  const [, prefix, a, b] = m;
  const lo = Number(a), hi = Number(b);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo || hi - lo > 5000) {
    return extractIds(cell);
  }
  const width = a!.length;
  const out: string[] = [];
  for (let i = lo; i <= hi; i++) out.push(`${prefix}-${String(i).padStart(width, "0")}`);
  return out;
}

/**
 * Does this cell hold a list of choices rather than a chosen value?
 *
 * Deliberately narrow. A cell is an option list only when every segment is
 * enum-shaped: an ALL-CAPS phrase, or one of the status vocabularies the
 * templates document inline. Content that merely contains a separator — a
 * multi-id `Source`, prose with a slash, anything using the house-style
 * middle dot — is a value and must survive.
 */
export function isOptionList(s: string): boolean {
  const segs = s
    .split(/\s+[/·]\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (segs.length < 2) return false;
  // Never treat harness ids as options — "EV-001 / EV-002" is a citation.
  if (segs.every((x) => new RegExp(`^(?:${ID_ALTERNATION})-\\d+$`).test(x))) return false;
  const ENUM_TOKENS = new Set([
    "ready", "not ready", "ready with caveats", "pass", "fail",
    "pass with caveats", "high", "med", "medium", "low", "yes", "no",
    "open", "closed", "met", "partial", "unmet", "observed", "system",
    "documented", "stated", "verified", "unverified", "assumption",
    "not-started", "active", "blocked", "done", "in-scope",
    "change-request", "accepted", "deferred", "declined", "raw",
    "converted", "redacted", "fold-in", "discard", "clustered",
    "scattered", "measured", "modelled", "assumed", "deterministic",
    "model-judgement", "human-gate", "leave-alone", "answerable",
    "needs-data", "not-modelled", "risk", "issue", "dependency",
    "shadowing", "task mining", "session replay", "meeting capture",
    "before/after", "control group", "shadow-mode agreement",
    "insight", "decision support", "system of record",
  ]);
  return segs.every(
    (x) => ENUM_TOKENS.has(x.toLowerCase()) || (x === x.toUpperCase() && /[A-Z]/.test(x)),
  );
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
  const bare = `(?:${ID_ALTERNATION})-?`;
  if (new RegExp(`^${bare}(\\s*[/,]\\s*${bare})*$`).test(s)) return false;
  if (/^""$/.test(s)) return false;
  // An option list is placeholder text, not a value: a cell still reading
  // "READY / READY WITH CAVEATS / NOT READY" must not be read as a decision.
  //
  // The first attempt at this rule was too blunt and caused worse bugs than
  // it fixed. It voided any cell containing a middle dot — which the
  // templates use as house style — and it read a legitimate multi-id Source
  // ("EV-001 / EV-002 / EV-003") as unsourced. Both punished correct work.
  //
  // So: only reject when the segments look like an *enum* — repeated
  // ALL-CAPS words or known status tokens — never merely because there are
  // several of them.
  if (isOptionList(s)) return false;
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

    // Citation integrity is checked on whatever ids are present, whether or
    // not the cell passes `filled()`. Nesting this inside the filled branch
    // meant a cell the heuristic mis-read escaped the check entirely — the
    // worst possible place to lose it.
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

    if (filled(source)) {
      requirements.sourced++;
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

  // Orphan evidence: captured but cited nowhere.
  //
  // This gathered citations from two tables, so every row of a fresh
  // shadowing session reported as an orphan — the loudest complaint firing
  // exactly when the FDE had just done the most valuable work in the method.
  // Every place an id can legitimately be cited is now consulted.
  const citedIds = new Set<string>();
  const CITING: [string, string, string[]][] = [
    ["requirements-register", "requirements-register.rows", ["Source"]],
    ["exception-register",    "exception-register.rows",    ["Source"]],
    ["exception-register",    "exception-register.undocumented", ["Ex id"]],
    ["operating-map",         "operating-map.steps",        ["Source", "Exceptions"]],
    ["operating-map",         "operating-map.triggers",     ["Source"]],
    ["operating-map",         "operating-map.judgement",    ["Source"]],
    ["operating-map",         "operating-map.undocumented", ["Ex id"]],
    ["operating-map",         "operating-map.dead-ends",    ["Source"]],
    ["open-questions",        "open-questions.contradictions", ["Doc source", "Obs source"]],
    ["value-hypothesis",      "value-hypothesis.baseline-method", ["Ev ids"]],
    ["allocation-grid",       "allocation-grid.rows",       ["Step #"]],
  ];
  for (const [instrument, table, columns] of CITING) {
    for (const r of rowsOf(instrument, table)) {
      for (const cname of columns) {
        for (const c of extractIds(col(r, cname))) citedIds.add(c);
      }
    }
  }
  // An `Ev range` such as "EV-001–EV-040" cites everything between its ends.
  for (const r of rowsOf("observation-log", "observation-log.sessions")) {
    for (const id of expandRange(col(r, "Ev range"))) citedIds.add(id);
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
  // A reversal is logged in its own table but names the same object as the
  // promotion it undoes, so counting rows counted a withdrawal as an arrival.
  const reversed = new Set(
    rowsOf("promotion-log", "promotion-log.reversals")
      .map((r) => col(r, "What").trim().toLowerCase())
      .filter(Boolean),
  );
  const ontologyObjects = {
    promoted: rowsOf("promotion-log", "promotion-log.rows").filter(
      (r) => !reversed.has(col(r, "What").trim().toLowerCase()),
    ).length,
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

  // ---- unverified requirements that have been allocated -------------------
  // Stated-only evidence carried into placement is the class that surfaces at
  // UAT. This previously fired for every UNVERIFIED row the moment anything
  // was allocated, and called it "stale" without any notion of age — so it
  // was noise on a healthy engagement. It now fires only for a requirement
  // whose own step has actually been allocated, which is the point at which
  // not having verified it starts to cost something.
  const allocatedReqs = new Set<string>();
  for (const r of alRows) {
    for (const cited of extractIds(col(r, "Step #", "Step"))) allocatedReqs.add(cited);
  }
  for (const r of reqRows) {
    if (col(r, "Confidence").trim() !== "UNVERIFIED") continue;
    const rid = col(r, "Id").trim();
    const reachedPlacement = allocations.total > 0 && (allocatedReqs.size === 0 || allocatedReqs.has(rid));
    if (!reachedPlacement) continue;
    findings.push({
      kind: "unverified-in-placement",
      id: rid || "(unnamed requirement)",
      location: "02-Workflow/requirements-register.md",
      detail: "Stated-only evidence, and placement has begun. Verify before build.",
    });
  }

  // ---- gap-without-question ----------------------------------------------
  // Four places in the harness instruct raising a `Q-` when a gap is found —
  // an exception with no rule holder, an unquantified frequency, an
  // unresolved term. Nothing checked that the question was ever raised, so
  // the gap-to-question link the whole coaching loop depends on was doctrine
  // only. A gap with no question behind it is a gap nobody will be asked.
  const questionText = rowsOf("open-questions", "open-questions.rows")
    .map((r) => `${col(r, "Question")} ${col(r, "Why it matters")} ${col(r, "Blocks")}`)
    .join("\n");
  const questionedIds = new Set(extractIds(questionText));

  const shouldHaveQuestion: { id: string; location: string; why: string }[] = [];
  for (const r of exRows) {
    const id = col(r, "Id").trim();
    if (!id) continue;
    if (!filled(col(r, "Rule holder (role)", "Rule holder"))) {
      shouldHaveQuestion.push({
        id,
        location: "02-Workflow/exception-register.md",
        why: "no rule holder named",
      });
    }
    const freq = col(r, "Frequency").trim();
    if (!filled(freq) || norm(freq) === "unquantified") {
      shouldHaveQuestion.push({
        id,
        location: "02-Workflow/exception-register.md",
        why: "frequency unquantified",
      });
    }
  }
  for (const g of shouldHaveQuestion) {
    if (questionedIds.has(g.id)) continue;
    findings.push({
      kind: "gap-without-question",
      id: g.id,
      location: g.location,
      detail: `${g.why}, and no open question cites ${g.id}. The harness says raise a Q- — nobody will be asked otherwise.`,
    });
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
      unverifiedInPlacement: count("unverified-in-placement"),
      gapsWithoutQuestion: count("gap-without-question"),
      unownedAssumptions: count("unowned-assumption"),
      allocationsWithoutReason: count("allocation-without-reason"),
      exceptionsWithoutRuleHolder: count("exception-without-rule-holder"),
      findings,
    },
  };
}
