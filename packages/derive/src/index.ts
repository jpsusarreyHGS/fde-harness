/**
 * @hgs-fde/derive — derives `state.json` from an FDE engagement's markdown.
 *
 * Zero runtime dependencies. Used by the runner today and by the web app's
 * ingest endpoint next, so the parse lives in exactly one place.
 */
export { parseAnchoredTables, dataRows, registerRows, answeredRows, isRetired, findTable, splitRow } from "./anchors.ts";
export type { ParsedTable, TableAnchor, TableRole } from "./anchors.ts";
export { deriveChain, extractIds, filled } from "./chain.ts";
export { coach, deskWork, nextConversations, verifyFirst, type CoachQuestion } from "./coach.ts";
export { recordAnswer } from "./answer.ts";
export { renderSketch, PROVISIONAL, SKETCH_DIR } from "./sketch.ts";
export type { SketchOptions, SketchResult } from "./sketch.ts";
export type { AnswerClass, RecordAnswerOptions, RecordAnswerResult } from "./answer.ts";
export { computeRoi, ROI_INPUTS, type RoiModel } from "./roi.ts";
export type { ChainCounts, ChainAudit, AuditFinding } from "./chain.ts";
export { INSTRUMENTS, STAGES, instrumentById, instrumentsForStage, instrumentStatus } from "./instruments.ts";
export type { InstrumentDef, StageDef, StageId } from "./instruments.ts";
export { scaffoldEngagement } from "./scaffold.ts";
export type { EngagementVars, ScaffoldResult } from "./scaffold.ts";
export { deriveState, SCHEMA_VERSION } from "./state.ts";
export type { State, Gate } from "./state.ts";
export { validateState, tampered } from "./validate.ts";
export type { Violation } from "./validate.ts";
export { mintIds, scanIds, knownIds, homeOf } from "./ids.ts";
export type { IdPrefix, MintResult } from "./ids.ts";
export { appendRows, fillCells, retireRow, tableColumns, tableInfo, cleanKey, escapeCell, WriteRefused } from "./writer.ts";
export type { AppendResult, TableInfo } from "./writer.ts";
export { sweepText, coverage, formatSweep, formatCoverage, TRANSCRIBE_TARGETS } from "./sweep.ts";
export type { SweepResult, SweptPerson, CoverageLine } from "./sweep.ts";
export {
  scanIntake, readIntake, transcriptToText, intakeBrief, handlingFor,
  EVIDENCE_CLASSES, EVIDENCE_ROOT, CLASS_MEANING,
} from "./intake.ts";
export type { EvidenceClass, IntakeItem, Handling } from "./intake.ts";
export {
  writeProposal, acceptProposal, pendingProposals, previewProposal, PROPOSALS_DIR,
  proposeFromSpec, rejectProposal, parseProposalBlocks,
} from "./proposals.ts";
export type {
  ProposalBlock, ProposalTarget, AcceptResult, ProposalSpec, ParsedProposalBlock,
} from "./proposals.ts";
