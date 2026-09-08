/**
 * @hgs-fde/derive — derives `state.json` from an FDE engagement's markdown.
 *
 * Zero runtime dependencies. Used by the runner today and by the web app's
 * ingest endpoint next, so the parse lives in exactly one place.
 */
export { parseAnchoredTables, dataRows, registerRows, findTable, splitRow } from "./anchors.ts";
export type { ParsedTable, TableAnchor, TableRole } from "./anchors.ts";
export { deriveChain, extractIds, filled } from "./chain.ts";
export type { ChainCounts, ChainAudit, AuditFinding } from "./chain.ts";
export { INSTRUMENTS, STAGES, instrumentById, instrumentsForStage, instrumentStatus } from "./instruments.ts";
export type { InstrumentDef, StageDef, StageId } from "./instruments.ts";
export { scaffoldEngagement } from "./scaffold.ts";
export type { EngagementVars, ScaffoldResult } from "./scaffold.ts";
export { deriveState, SCHEMA_VERSION } from "./state.ts";
export type { State, Gate } from "./state.ts";
export { validateState, tampered } from "./validate.ts";
export type { Violation } from "./validate.ts";
