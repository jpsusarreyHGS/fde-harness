/**
 * Reading and writing engagement state.
 *
 * Two backends, chosen at runtime:
 *   - Postgres, when `DATABASE_URL` is set
 *   - the filesystem, otherwise — `engagements/<slug>/state.json` under the
 *     harness root, exactly where `/dashboard` writes it
 *
 * ## Why JSONB and not a normalised schema yet
 *
 * The plan called for a relational model with composite `(slug, id)` keys and
 * soft deletes. That is right, and it is not yet earned. Phase 2 is read-only
 * visibility: nothing here needs row-level identity, and Postgres queries
 * JSONB well enough for the portfolio view.
 *
 * The normalised tables land when Phase 4's approval inbox attaches decisions
 * to individual rows — that is the point at which a row needs a durable
 * identity, a `retired` flag and a reason, because a decision must outlive an
 * edit to the markdown. Building it before then would be a schema maintained
 * against no consumer.
 *
 * The ids themselves are already immutable and append-only in the markdown,
 * so nothing about that migration is blocked by this choice.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { getDb } from "./db";

/** The v2 shape, as far as the app needs to know it. */
export interface EngagementState {
  schemaVersion: number;
  generatedAt: string;
  engagement: Record<string, string>;
  stages: { id: string; slug: string; label: string; status: string; pct: number }[];
  gates: {
    id: string; label: string; between: string; status: string;
    date: string | null; decidedBy: string | null;
    criteria: { name: string; status: string; evidence: string; toClose: string; owner: string }[];
    behaviours: { name: string; observed: boolean; where: string }[];
  }[];
  instruments: {
    id: string; label: string; path: string; stage: string; rows: number;
    tables: { name: string; role: string; rows: number }[];
    status: string; updated: string | null; present: boolean;
  }[];
  chain: {
    evidence: { total: number; observed: number; system: number; documented: number; stated: number };
    exceptions: { total: number; withRuleHolder: number; quantified: number };
    requirements: { total: number; sourced: number; verified: number; unverified: number; assumption: number; withAC: number };
    allocations: { total: number; withReason: number; deterministic: number; modelJudgement: number; humanGate: number; leaveAlone: number };
    ontologyObjects: { promoted: number; backlog: number };
    competencyQuestions: { total: number; answerable: number; needsData: number; notModelled: number };
    evalCases: { total: number; passing: number; failing: number; p0: number };
    audit: {
      unsourcedRequirements: number; orphanEvidence: number; danglingCitations: number;
      staleUnverified: number; unownedAssumptions: number;
      allocationsWithoutReason: number; exceptionsWithoutRuleHolder: number;
      findings: { kind: string; id: string; location: string; detail: string }[];
    };
  };
  openQuestions: Record<string, string>[];
  raid: Record<string, string>[];
  autonomy: Record<string, unknown>[];
  prioritisation: Record<string, string>[];
  deliverables: { name: string; stage: string; rendered: boolean }[];
  datasources: { name: string; sizeBytes: number; classification: string }[];
  skills: { practice: number; engagement: number; function: number; supersedes: unknown[] };
  /**
   * Work waiting on a person. Optional because an engagement whose state.json
   * predates the intake loop simply has none — the console must render, not
   * crash, on a schema it is ahead of.
   */
  intake?: {
    waiting: number;
    byClass: Record<string, number>;
    unclassified: string[];
    needsService: number;
    pendingProposals: string[];
  };
  harnessImprover: {
    lastRun: string | null; openProposals: number;
    feedbackFilesWithEntries: number; pendingPromptEdits: number;
  };
  sessions: { count: number; latest: string | null; latestDate: string | null; latestSummary: string | null };
  runEvents: { count: number; latest: string | null; byAgent: Record<string, number> };
  friction: { session: string; note: string }[];
  /**
   * The ranked question queue. Optional so a state.json written before the
   * coach existed still renders — the console degrades, it does not crash.
   */
  coach?: {
    key: string; ask: string; who: string; whoName: string | null;
    blocks: string; location: string; why: string; score: number;
    work: "ask" | "fix";
    source: "gate" | "chain" | "open-question" | "stakeholder";
    id: string | null;
  }[];
}

export interface StoreInfo {
  backend: "postgres" | "filesystem";
  /** Where the filesystem backend looked, so an empty console can say why. */
  path?: string;
}

/** Harness root, so the filesystem backend can find `engagements/`. */
function harnessRoot(): string {
  return process.env.HARNESS_ROOT
    ? resolve(process.env.HARNESS_ROOT)
    : resolve(process.cwd(), "..", "..");
}

export async function storeInfo(): Promise<StoreInfo> {
  const sql = await getDb();
  if (sql) return { backend: "postgres" };
  return { backend: "filesystem", path: join(harnessRoot(), "engagements") };
}

async function fsList(): Promise<EngagementState[]> {
  const dir = join(harnessRoot(), "engagements");
  let slugs: string[];
  try {
    slugs = (await readdir(dir, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name);
  } catch {
    return [];
  }
  const out: EngagementState[] = [];
  for (const slug of slugs) {
    try {
      const raw = await readFile(join(dir, slug, "state.json"), "utf8");
      const parsed = JSON.parse(raw) as EngagementState;
      parsed.engagement = { ...parsed.engagement, slug };
      out.push(parsed);
    } catch {
      // No state.json yet means /dashboard has not run. Not an error —
      // the console shows the engagement as un-derived rather than hiding it.
    }
  }
  return out;
}

export async function listEngagements(): Promise<EngagementState[]> {
  const sql = await getDb();
  if (!sql) return fsList();
  const rows = await sql<{ state: EngagementState }[]>`
    select state from engagements order by ingested_at desc
  `;
  return rows.map((r) => r.state);
}

export async function getEngagement(slug: string): Promise<EngagementState | null> {
  const sql = await getDb();
  if (!sql) {
    const all = await fsList();
    return all.find((e) => e.engagement["slug"] === slug) ?? null;
  }
  const rows = await sql<{ state: EngagementState }[]>`
    select state from engagements where slug = ${slug} limit 1
  `;
  return rows[0]?.state ?? null;
}

export interface IngestResult {
  stored: "postgres" | "rejected";
  slug: string;
  note?: string;
}

/**
 * Accept derived state from the runner.
 *
 * Rejects a payload whose gate claims `passed` with no decider — the same
 * invariant the derive CLI enforces before emitting. Checking it again here
 * is deliberate: the ingest endpoint is a trust boundary, and re-checking at
 * the boundary is exactly the pattern the two-phase write uses.
 */
export async function ingestState(state: EngagementState): Promise<IngestResult> {
  const slug = state.engagement["slug"];
  if (!slug) return { stored: "rejected", slug: "", note: "state.engagement.slug missing" };
  if (state.schemaVersion !== 2) {
    return { stored: "rejected", slug, note: `unsupported schemaVersion ${state.schemaVersion}` };
  }
  for (const g of state.gates ?? []) {
    if (g.status === "passed" && !g.decidedBy) {
      return {
        stored: "rejected",
        slug,
        note: `${g.id} claims passed with no decidedBy. Code never sets passed.`,
      };
    }
  }

  const sql = await getDb();
  if (!sql) {
    return {
      stored: "rejected",
      slug,
      note: "No DATABASE_URL configured. The console reads state.json from disk in this mode; ingest needs a database.",
    };
  }

  const e = state.engagement;
  await sql`
    insert into engagements
      (slug, client, sponsor, stage, residency, labour, schema_version, generated_at, state)
    values (
      ${slug}, ${e["client"] ?? slug}, ${e["sponsor"] ?? null}, ${e["stage"] ?? null},
      ${e["residency"] ?? null}, ${e["labour"] ?? null},
      ${state.schemaVersion}, ${state.generatedAt}, ${sql.json(state as never)}
    )
    on conflict (slug) do update set
      client = excluded.client, sponsor = excluded.sponsor, stage = excluded.stage,
      residency = excluded.residency, labour = excluded.labour,
      schema_version = excluded.schema_version, generated_at = excluded.generated_at,
      ingested_at = now(), state = excluded.state
  `;
  return { stored: "postgres", slug };
}
