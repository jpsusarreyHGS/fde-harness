/**
 * Invariant checks on a derived state.
 *
 * These are the rules a JSON Schema cannot express — the ones that make the
 * difference between a file that is well-shaped and a file that is honest.
 * Shape is already guaranteed by the TypeScript types, since both consumers
 * (the runner and the web app) are TypeScript; what needs guarding is
 * tampering and arithmetic that cannot be true.
 */

import type { State } from "./state.ts";

export interface Violation {
  rule: string;
  detail: string;
  /** `tampered` means the file was hand-edited to claim something untrue. */
  severity: "tampered" | "inconsistent";
}

export function validateState(s: State): Violation[] {
  const v: Violation[] = [];
  const bad = (rule: string, detail: string, severity: Violation["severity"] = "inconsistent") =>
    v.push({ rule, detail, severity });

  if (s.schemaVersion !== 2) {
    bad("schemaVersion", `expected 2, got ${String(s.schemaVersion)}. Regenerate rather than migrate — it is derived.`);
  }

  // The rule the whole gate design rests on.
  for (const g of s.gates) {
    if (g.status === "passed" && !g.decidedBy) {
      bad(
        "gate-passed-requires-decider",
        `${g.id} claims passed with no decidedBy. Code never sets passed — a person does, with a name.`,
        "tampered",
      );
    }
    if (g.status === "passed" && !g.date) {
      bad("gate-passed-requires-date", `${g.id} claims passed with no decision date.`, "tampered");
    }
  }

  // Autonomy: a rung above shadow with no measurement is an assertion.
  for (const a of s.autonomy) {
    const rung = String(a["rung"] ?? "");
    const agreement = a["agreement"];
    const n = Number.parseInt(rung, 10);
    if (Number.isFinite(n) && n >= 3 && (agreement === null || agreement === undefined)) {
      bad(
        "rung-requires-measurement",
        `${String(a["workflow"])} sits at rung ${rung} with no agreement figure. A demo is not a measurement.`,
        "tampered",
      );
    }
  }

  // Arithmetic that cannot be true.
  const c = s.chain;
  const le = (a: number, b: number, rule: string, what: string) => {
    if (a > b) bad(rule, `${what}: ${a} > ${b}`);
  };
  le(c.requirements.sourced, c.requirements.total, "sourced-lte-total", "requirements sourced");
  le(c.requirements.withAC, c.requirements.total, "withAC-lte-total", "requirements with AC");
  le(c.exceptions.withRuleHolder, c.exceptions.total, "ruleHolder-lte-total", "exceptions with a rule holder");
  le(c.exceptions.quantified, c.exceptions.total, "quantified-lte-total", "exceptions quantified");
  le(c.allocations.withReason, c.allocations.total, "reason-lte-total", "allocations with a reason");
  le(c.evalCases.passing + c.evalCases.failing, c.evalCases.total, "eval-parts-lte-total", "eval pass+fail");
  le(
    c.evidence.observed + c.evidence.system + c.evidence.documented + c.evidence.stated,
    c.evidence.total,
    "evidence-classes-lte-total",
    "evidence by class",
  );
  le(
    c.competencyQuestions.answerable + c.competencyQuestions.needsData + c.competencyQuestions.notModelled,
    c.competencyQuestions.total,
    "cq-statuses-lte-total",
    "competency questions by status",
  );

  // Audit counts must match the findings they summarise.
  const byKind = (k: string) => c.audit.findings.filter((f) => f.kind === k).length;
  const pairs: [keyof typeof c.audit, string][] = [
    ["unsourcedRequirements", "unsourced-requirement"],
    ["orphanEvidence", "orphan-evidence"],
    ["danglingCitations", "dangling-citation"],
    ["staleUnverified", "stale-unverified"],
    ["unownedAssumptions", "unowned-assumption"],
    ["allocationsWithoutReason", "allocation-without-reason"],
    ["exceptionsWithoutRuleHolder", "exception-without-rule-holder"],
  ];
  for (const [field, kind] of pairs) {
    const declared = c.audit[field];
    if (typeof declared === "number" && declared !== byKind(kind)) {
      bad(
        "audit-count-matches-findings",
        `audit.${String(field)} says ${declared} but ${byKind(kind)} findings of kind ${kind} are listed`,
        "tampered",
      );
    }
  }

  for (const st of s.stages) {
    if (st.pct < 0 || st.pct > 100) bad("stage-pct-range", `${st.id} pct is ${st.pct}`);
    if (st.pct === 0 && st.status !== "not-started" && st.status !== "blocked") {
      bad("stage-status-matches-pct", `${st.id} is ${st.status} at 0%`);
    }
    if (st.pct === 100 && st.status !== "complete") {
      bad("stage-status-matches-pct", `${st.id} is ${st.status} at 100%`);
    }
  }

  if (s.stages.length !== 10) {
    bad("ten-stages", `expected the runbook's ten stages, got ${s.stages.length}`);
  }

  return v;
}

/** Blocking violations — anything that means the file is not trustworthy. */
export function tampered(v: Violation[]): Violation[] {
  return v.filter((x) => x.severity === "tampered");
}
