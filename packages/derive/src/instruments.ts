/**
 * The instrument registry.
 *
 * This is the contract between the templates and derived state: which files
 * exist, which stage each belongs to, and which anchored table carries the
 * rows that count toward instrument coverage.
 *
 * Drift between this registry and the templates is a defect, and
 * `test/registry.test.ts` asserts both directions:
 *   - every registry path has a template
 *   - every template holding a `role=register` table is in the registry
 */

export type StageId =
  | "00" | "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09";

export interface StageDef {
  id: StageId;
  slug: string;
  /** The runbook's own name for the stage. Do not paraphrase. */
  label: string;
}

/** The runbook's ten stages, in order. */
export const STAGES: readonly StageDef[] = [
  { id: "00", slug: "00-Setup",        label: "Before you land" },
  { id: "01", slug: "01-Organisation", label: "Map the organisation" },
  { id: "02", slug: "02-Workflow",     label: "Gather the real workflow" },
  { id: "03", slug: "03-Systems",      label: "Analyse the systems" },
  { id: "04", slug: "04-Placement",    label: "Place the intelligence" },
  { id: "05", slug: "05-Build",        label: "Build the MVP" },
  { id: "06", slug: "06-Evals",        label: "Prove it with evals" },
  { id: "07", slug: "07-Production",   label: "Ship into production" },
  { id: "08", slug: "08-ROI",          label: "Calculate the ROI" },
  { id: "09", slug: "09-Loop",         label: "Run the loop again" },
] as const;

export interface InstrumentDef {
  /** Stable id, used as the key in derived state. */
  id: string;
  label: string;
  stage: StageId;
  /** Path relative to the engagement root. */
  path: string;
  /**
   * The anchored table whose data rows represent "how populated is this
   * instrument". Omitted where an instrument has no single primary table
   * (its coverage then counts every register table it holds).
   */
  primaryTable?: string;
  /** Counts toward the stage-coverage ratio for stages 00-03. */
  coverage?: boolean;
  /**
   * How "populated" is measured.
   *
   * `rows` (default) counts data rows in the primary register table.
   * `fields` counts filled values across the instrument's kv and labels
   * tables — for instruments that are genuinely not row-shaped, such as the
   * evidence-handling terms or the sponsor brief. Without this they would
   * read `empty` however completely they were filled in.
   */
  coverageMode?: "rows" | "fields";
}

export const INSTRUMENTS: readonly InstrumentDef[] = [
  // 00 — Before you land
  { id: "pilot-charter",          label: "Pilot charter",          stage: "00", path: "00-Setup/pilot-charter.md",           primaryTable: "pilot-charter.acceptance", coverage: true },
  { id: "evidence-handling-terms",label: "Evidence-handling terms",stage: "00", path: "00-Setup/evidence-handling-terms.md",   coverage: true, coverageMode: "fields" },
  { id: "stack-decision",         label: "Stack decision",         stage: "00", path: "00-Setup/stack-decision.md",          primaryTable: "stack-decision.client-platforms", coverage: true },

  // 01 — Map the organisation
  { id: "stakeholder-map",        label: "Stakeholder map",        stage: "01", path: "01-Organisation/stakeholder-map.md",   primaryTable: "stakeholder-map.decision-rights", coverage: true },
  { id: "sponsor-brief",          label: "Sponsor brief",          stage: "01", path: "01-Organisation/sponsor-brief.md",       coverage: true, coverageMode: "fields" },

  // 02 — Gather the real workflow
  { id: "observation-log",        label: "Observation log",        stage: "02", path: "02-Workflow/observation-log.md",       primaryTable: "observation-log.rows",      coverage: true },
  { id: "operating-map",          label: "Operating map",          stage: "02", path: "02-Workflow/operating-map.md",         primaryTable: "operating-map.steps",       coverage: true },
  { id: "exception-register",     label: "Exception register",     stage: "02", path: "02-Workflow/exception-register.md",    primaryTable: "exception-register.rows",   coverage: true },
  { id: "requirements-register",  label: "Requirements register",  stage: "02", path: "02-Workflow/requirements-register.md", primaryTable: "requirements-register.rows",coverage: true },
  { id: "open-questions",         label: "Open questions",         stage: "02", path: "02-Workflow/open-questions.md",        primaryTable: "open-questions.rows",       coverage: true },

  // 03 — Analyse the systems
  { id: "systems-inventory",      label: "Systems inventory",      stage: "03", path: "03-Systems/systems-inventory.md",      primaryTable: "systems-inventory.applications", coverage: true },
  { id: "readiness-scorecard",    label: "Readiness scorecard",    stage: "03", path: "03-Systems/readiness-scorecard.md",    primaryTable: "readiness-scorecard.rows", coverage: true },
  { id: "vocabulary-audit",       label: "Vocabulary audit",       stage: "03", path: "03-Systems/vocabulary-audit.md",       primaryTable: "vocabulary-audit.terms", coverage: true },
  { id: "glossary",               label: "Glossary",               stage: "03", path: "03-Systems/ontology/glossary.md",      primaryTable: "glossary.terms", coverage: true },
  { id: "personas",               label: "Personas",               stage: "03", path: "03-Systems/ontology/personas.md",      primaryTable: "personas.rows", coverage: true },
  { id: "competency-questions",   label: "Competency questions",   stage: "03", path: "03-Systems/ontology/competency-questions.md", primaryTable: "competency-questions.rows", coverage: true },
  { id: "source-systems",         label: "Source systems",         stage: "03", path: "03-Systems/ontology/source-systems.md",primaryTable: "source-systems.sources", coverage: true },
  { id: "entities",               label: "Entities",               stage: "03", path: "03-Systems/ontology/entities.md",      primaryTable: "entities.rows", coverage: true },
  { id: "ontology-backlog",       label: "Ontology backlog",       stage: "03", path: "03-Systems/ontology/backlog.md",       primaryTable: "ontology-backlog.rows" },
  { id: "promotion-log",          label: "Promotion log",          stage: "03", path: "03-Systems/ontology/promotion-log.md", primaryTable: "promotion-log.rows" },

  // 04 — Place the intelligence
  { id: "allocation-grid",        label: "Allocation grid",        stage: "04", path: "04-Placement/allocation-grid.md",      primaryTable: "allocation-grid.rows" },
  { id: "prioritisation",         label: "Prioritisation",         stage: "04", path: "04-Placement/prioritisation.md",       primaryTable: "prioritisation.rows" },
  { id: "cost-envelope",          label: "Cost envelope",          stage: "04", path: "04-Placement/cost-envelope.md",        primaryTable: "cost-envelope.rows" },
  { id: "value-hypothesis",       label: "Value hypothesis",       stage: "04", path: "04-Placement/value-hypothesis.md",     primaryTable: "value-hypothesis.metrics" },

  // 05 — Build the MVP
  { id: "spec",                   label: "Spec",                   stage: "05", path: "05-Build/spec.md",                     primaryTable: "spec.steps" },
  { id: "architecture",           label: "Architecture",           stage: "05", path: "05-Build/architecture.md",              primaryTable: "architecture.components" },
  { id: "architecture-diagram",   label: "Architecture diagram",   stage: "05", path: "05-Build/architecture-diagram.md" },
  { id: "access-model",           label: "Access model",           stage: "05", path: "05-Build/access-model.md",              primaryTable: "access-model.matrix" },
  { id: "manual-tasks",           label: "Manual tasks",           stage: "05", path: "05-Build/manual-tasks.md",             primaryTable: "manual-tasks.rows" },

  // 06 — Prove it with evals
  { id: "eval-report",            label: "Eval report",            stage: "06", path: "06-Evals/eval-report.md",              primaryTable: "eval-report.failures" },

  // 07 — Ship into production
  { id: "autonomy-ledger",        label: "Autonomy ledger",        stage: "07", path: "07-Production/autonomy-ledger.md",      primaryTable: "autonomy-ledger.measurements" },
  { id: "adoption",               label: "Adoption",               stage: "07", path: "07-Production/adoption.md",             primaryTable: "adoption.cohort" },
  { id: "fold-in-or-discard",     label: "Fold-in or discard",     stage: "07", path: "07-Production/fold-in-or-discard.md",   primaryTable: "fold-in-or-discard.rows" },
  { id: "runbook",                label: "Production runbook",     stage: "07", path: "07-Production/runbook.md" },

  // 08 — Calculate the ROI
  { id: "roi-model",              label: "ROI model",              stage: "08", path: "08-ROI/roi-model.md" },
  { id: "executive-readout",      label: "Executive readout",      stage: "08", path: "08-ROI/executive-readout.md" },

  // 09 — Run the loop again
  { id: "retrospective",          label: "Retrospective",          stage: "09", path: "09-Loop/retrospective.md" },
  { id: "library-contribution",   label: "Library contribution",   stage: "09", path: "09-Loop/library-contribution.md",       primaryTable: "library-contribution.rows" },

  // Engagement management — not stage-scoped
  { id: "roadmap",                label: "Roadmap",                stage: "00", path: "engagement-management/roadmap.md",       primaryTable: "roadmap.slices" },
  { id: "raid-log",               label: "RAID log",               stage: "00", path: "engagement-management/raid-log.md",     primaryTable: "raid-log.risks" },
  { id: "scope-changes",          label: "Scope changes",          stage: "00", path: "engagement-management/scope-changes.md", primaryTable: "scope-changes.rows" },
] as const;

export function instrumentById(id: string): InstrumentDef | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}

export function instrumentsForStage(stage: StageId): InstrumentDef[] {
  return INSTRUMENTS.filter((i) => i.stage === stage);
}

/** Instrument status thresholds, per `state-schema.md`. */
export function instrumentStatus(rows: number): "empty" | "thin" | "populated" {
  if (rows === 0) return "empty";
  if (rows <= 4) return "thin";
  return "populated";
}
