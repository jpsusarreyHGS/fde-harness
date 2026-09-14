/**
 * Assemble `state.json` v2 from an engagement's files.
 *
 * Every value is counted from disk. Nothing is carried forward, recalled or
 * estimated. If this and the engagement files disagree, the files are right.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, sep } from "node:path";
import {
  answeredRows, dataRows, findTable, parseAnchoredTables, type ParsedTable,
} from "./anchors.ts";
import { deriveChain, filled, type ChainCounts } from "./chain.ts";
import { scanIntake } from "./intake.ts";
import { coach, type CoachQuestion } from "./coach.ts";
import { CONTRACT_SCHEMA } from "./instruments.ts";
import { checkContract, readContract } from "./contract.ts";
import { computeRoi, type RoiModel } from "./roi.ts";
import { pendingProposals } from "./proposals.ts";
import {
  INSTRUMENTS, instrumentStatus, STAGES, type StageId,
} from "./instruments.ts";

export const SCHEMA_VERSION = 2 as const;

/** Re-exported so one import gets both versions a consumer cares about. */
export { CONTRACT_SCHEMA } from "./instruments.ts";

export interface State {
  schemaVersion: 2;
  /**
   * The contract-layer version the ontology compiler parses against.
   * Derived, never typed — a property of the templates, not of an engagement.
   */
  contractSchema: string;
  generatedAt: string;
  engagement: Record<string, string>;
  stages: {
    id: StageId; slug: string; label: string;
    status: "not-started" | "active" | "complete" | "blocked";
    pct: number;
  }[];
  gates: Gate[];
  instruments: {
    id: string; label: string; path: string; stage: StageId;
    rows: number; tables: { name: string; role: string; rows: number }[];
    status: "empty" | "thin" | "populated"; updated: string | null;
    present: boolean;
  }[];
  chain: ChainCounts;
  openQuestions: Record<string, string>[];
  raid: Record<string, string>[];
  autonomy: Record<string, unknown>[];
  prioritisation: Record<string, string>[];
  deliverables: { name: string; stage: string; rendered: boolean }[];
  datasources: { name: string; sizeBytes: number; classification: string }[];
  skills: {
    practice: number; engagement: number; function: number;
    supersedes: { engagementSkill: string; practiceSkill: string }[];
  };
  harnessImprover: {
    lastRun: string | null; openProposals: number;
    feedbackFilesWithEntries: number; pendingPromptEdits: number;
  };
  /**
   * Material and proposals waiting on a person.
   *
   * Every other number here is derived from register rows, which means a file
   * an FDE dropped this morning is invisible to all of them. This block is the
   * only part of state that can see the work that has not entered the chain
   * yet, and it is the part most likely to have changed since the last read.
   */
  intake: {
    /** Files under `02-Workflow/evidence/<class>/`, by class. */
    waiting: number;
    byClass: Record<string, number>;
    /** Dropped outside a class folder — the class is reported, never guessed. */
    unclassified: string[];
    /** Needs a transcription or description pass before it can be read. */
    needsService: number;
    /** Proposals with neither an accept nor a reject marker. */
    pendingProposals: string[];
  };
  sessions: {
    count: number; latest: string | null;
    latestDate: string | null; latestSummary: string | null;
  };
  runEvents: {
    count: number; latest: string | null;
    byAgent: Record<string, number>;
  };
  /**
  * The ROI model, computed rather than typed.
  *
  * The runbook: "Show the arithmetic. The first question will be where the
  * number came from."
  */
  roi: RoiModel;
  friction: { session: string; note: string }[];
  /**
   * The ranked question queue.
   *
   * Derived from the same findings and gate criteria as everything else, so
   * the terminal and the console cannot disagree about what to ask next.
   */
  coach: CoachQuestion[];
}

export interface Gate {
  id: "G1" | "G2" | "G3";
  label: string;
  between: string;
  status: "not-run" | "ready" | "caveats" | "not-ready" | "passed";
  date: string | null;
  decidedBy: string | null;
  criteria: { name: string; status: string; evidence: string; toClose: string; owner: string }[];
  behaviours: { name: string; observed: boolean; where: string }[];
  /** The memo's own self-check. Four cells were typed and none consumed. */
  antiPatterns: { name: string; confirmed: boolean }[];
}

const GATE_META: Record<Gate["id"], { label: string; between: string }> = {
  G1: { label: "Discovery", between: "03→04" },
  G2: { label: "Build", between: "06→07" },
  G3: { label: "Production", between: "08→09" },
};

async function readIf(p: string): Promise<string | null> {
  try { return await readFile(p, "utf8"); } catch { return null; }
}
async function lsIf(p: string): Promise<string[]> {
  try { return await readdir(p); } catch { return []; }
}
async function mtime(p: string): Promise<string | null> {
  try { return (await stat(p)).mtime.toISOString().slice(0, 10); } catch { return null; }
}
function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}
function col(r: Record<string, string>, ...names: string[]): string {
  for (const n of names) if (r[n] !== undefined) return r[n]!;
  return "";
}

/** Map an anchor's instrument segment back to a registry id. */
function anchorInstrumentToId(seg: string): string {
  return seg;
}

function parseGate(id: Gate["id"], md: string | null): Gate {
  const meta = GATE_META[id];
  const base: Gate = {
    id, label: meta.label, between: meta.between,
    status: "not-run", date: null, decidedBy: null,
    criteria: [], behaviours: [], antiPatterns: [],
  };
  if (!md) return base;

  const tables = parseAnchoredTables(md);
  const prefix = `stage-gate-${id[1]}`;

  const decision = findTable(tables, `${prefix}.decision`);
  if (decision) {
    for (const r of decision.rows) {
      const k = (col(r, "Item") || "").toLowerCase();
      const v = col(r, "Value").trim();
      if (k === "recommendation" && filled(v)) {
        const n = v.toLowerCase();
        if (n.includes("not ready")) base.status = "not-ready";
        else if (n.includes("caveat")) base.status = "caveats";
        else if (n.includes("ready")) base.status = "ready";
      }
      if (k === "decided" && filled(v)) base.date = v;
      if (k === "decided by" && filled(v)) base.decidedBy = v;
    }
  }

  const crit = findTable(tables, `${prefix}.criteria`);
  if (crit) {
    for (const r of crit.rows) {
      const name = col(r, "Criterion");
      if (!filled(name)) continue;
      base.criteria.push({
        name,
        status: col(r, "Status").trim() || "unmet",
        evidence: col(r, "Evidence"),
        toClose: col(r, "To close"),
        owner: col(r, "Owner"),
      });
    }
  }

  const beh = findTable(tables, `${prefix}.behaviours`);
  if (beh) {
    for (const r of beh.rows) {
      const name = col(r, "Behaviour");
      if (!filled(name)) continue;
      // `filled("no")` is true, so a presence check marked "no" as observed.
      // Parse the affirmative explicitly and treat anything else as not yet.
      const raw = col(r, "Observed").trim().toLowerCase();
      base.behaviours.push({
        name,
        observed: /^(y|yes|true|done|observed|✓|x)$/.test(raw),
        where: col(r, "Where"),
      });
    }
  }

  const anti = findTable(tables, `${prefix}.anti-patterns`);
  if (anti) {
    for (const r of anti.rows) {
      const name = col(r, "Check");
      if (!filled(name)) continue;
      const raw = col(r, "Confirmed").trim().toLowerCase();
      base.antiPatterns.push({
        name,
        confirmed: /^(y|yes|true|done|✓|x)$/.test(raw),
      });
    }
  }

  // `passed` is never derived. A file claiming it without a decider is tampered.
  if (base.decidedBy && base.date && base.status === "ready") base.status = "passed";
  return base;
}

export async function deriveState(opts: {
  engagementDir: string;
  slug: string;
  harnessRoot?: string;
  datasourcesDir?: string;
  deliverablesDir?: string;
  now?: Date;
}): Promise<State> {
  const { engagementDir, slug } = opts;
  const now = opts.now ?? new Date();

  // ---- parse every instrument -------------------------------------------
  const tablesByInstrument = new Map<string, ParsedTable[]>();
  const instruments: State["instruments"] = [];

  for (const def of INSTRUMENTS) {
    const abs = join(engagementDir, ...def.path.split("/"));
    const md = await readIf(abs);
    const tables = md ? parseAnchoredTables(md) : [];

    for (const t of tables) {
      const key = anchorInstrumentToId(t.anchor.instrument);
      const list = tablesByInstrument.get(key) ?? [];
      list.push(t);
      tablesByInstrument.set(key, list);
    }

    const registerTables = tables.filter((t) => t.anchor.role === "register");
    let rows: number;
    if (def.coverageMode === "fields") {
      // Not row-shaped. Coverage is the number of answered labels rows — the
      // template's own key and hint columns are schema and must not count.
      rows = tables
        .filter((t) => t.anchor.role === "labels" && t.anchor.answerColumn)
        .reduce((n, t) => n + answeredRows(t).length, 0);
    } else if (def.primaryTable) {
      const pt = findTable(tables, def.primaryTable);
      rows = pt ? dataRows(pt).length : 0;
    } else {
      rows = registerTables.reduce((n, t) => n + dataRows(t).length, 0);
    }

    instruments.push({
      id: def.id, label: def.label, path: def.path, stage: def.stage,
      rows,
      tables: tables.map((t) => ({
        name: t.anchor.name, role: t.anchor.role, rows: dataRows(t).length,
      })),
      status: instrumentStatus(rows),
      updated: md ? await mtime(abs) : null,
      present: md !== null,
    });
  }

  // ---- eval cases --------------------------------------------------------
  const goldenFiles = (await lsIf(join(engagementDir, "06-Evals", "golden-sets")))
    .filter((f) => f.endsWith(".md"));
  let evalTotal = 0;
  for (const f of goldenFiles) {
    const md = await readIf(join(engagementDir, "06-Evals", "golden-sets", f));
    if (!md) continue;
    for (const t of parseAnchoredTables(md)) {
      if (t.anchor.role === "register") evalTotal += dataRows(t).length;
    }
  }
  const reportTables = tablesByInstrument.get("eval-report") ?? [];
  const failureRows = (() => {
    const t = findTable(reportTables, "eval-report.failures");
    return t ? dataRows(t) : [];
  })();
  const p0 = failureRows.filter((r) => /p0/i.test(col(r, "Severity"))).length;

  const chain = deriveChain({
    tables: tablesByInstrument,
    evalCases: {
      total: evalTotal,
      passing: Math.max(0, evalTotal - failureRows.length),
      failing: failureRows.length,
      p0,
    },
  });

  // ---- gates -------------------------------------------------------------
  const gates: Gate[] = [];
  for (const id of ["G1", "G2", "G3"] as const) {
    const md = await readIf(
      join(engagementDir, "engagement-management", `stage-gate-${id[1]}-readiness.md`),
    );
    gates.push(parseGate(id, md));
  }

  // ---- stages ------------------------------------------------------------
  // Reads that the stage computation needs are hoisted: the map below is
  // synchronous, and an await inside it would yield an array of promises.
  const roiMd = await readIf(join(engagementDir, "08-ROI", "roi-model.md"));
  const roiInputsFilled = (() => {
    if (!roiMd) return 0;
    const t = findTable(parseAnchoredTables(roiMd), "roi-model.inputs");
    return t ? t.rows.filter((r) => filled(col(r, "Actual (measured)"))).length : 0;
  })();

  const stages: State["stages"] = STAGES.map((s) => {
    const own = instruments.filter((i) => i.stage === s.id);
    let p = 0;
    if (["00", "01", "02", "03"].includes(s.id)) {
      const cov = own.filter((i) => INSTRUMENTS.find((d) => d.id === i.id)?.coverage);
      p = pct(cov.filter((i) => i.status !== "empty").length, cov.length);
    } else if (s.id === "04") {
      const steps = (() => {
        const t = findTable(tablesByInstrument.get("operating-map") ?? [], "operating-map.steps");
        return t ? dataRows(t).length : 0;
      })();
      p = pct(chain.allocations.total, steps);
    } else if (s.id === "05") {
      p = pct(0, chain.requirements.total); // implemented-marking lands with the build loop
    } else if (s.id === "06") {
      p = pct(chain.evalCases.passing, chain.evalCases.total);
    } else if (s.id === "07") {
      const rungs = (tablesByInstrument.get("autonomy-ledger") ?? []);
      const t = findTable(rungs, "autonomy-ledger.measurements");
      const measured = t ? dataRows(t).filter((r) => filled(col(r, "Agreement"))).length : 0;
      p = pct(Math.min(measured, 5), 5);
    } else if (s.id === "08") {
      p = pct(roiInputsFilled, 9);
    } else {
      const t = findTable(tablesByInstrument.get("library-contribution") ?? [], "library-contribution.rows");
      p = t && dataRows(t).length > 0 ? 100 : 0;
    }

    const status: State["stages"][number]["status"] =
      p === 0 ? "not-started" : p === 100 ? "complete" : "active";
    return { id: s.id, slug: s.slug, label: s.label, status, pct: p };
  });

  // ---- registers the dashboard renders directly --------------------------
  const tableRows = (instrument: string, table: string) => {
    const t = findTable(tablesByInstrument.get(instrument) ?? [], table);
    return t ? dataRows(t) : [];
  };

  const openQuestions = tableRows("open-questions", "open-questions.rows")
    .filter((r) => !filled(col(r, "Answered")));

  const raid = [
    ...tableRows("raid-log", "raid-log.risks"),
    ...tableRows("raid-log", "raid-log.assumptions"),
    ...tableRows("raid-log", "raid-log.issues"),
    ...tableRows("raid-log", "raid-log.dependencies"),
  ];

  const autonomy = tableRows("autonomy-ledger", "autonomy-ledger.measurements").map((r) => ({
    workflow: col(r, "Workflow"),
    rung: col(r, "Rung"),
    exitCriterion: col(r, "Exit criterion"),
    agreement: filled(col(r, "Agreement")) ? col(r, "Agreement") : null,
    sample: col(r, "Sample") || null,
    window: col(r, "Window"),
    disagreementPattern: col(r, "Disagreement pattern") || null,
    understood: /^y|true/i.test(col(r, "Understood?")),
    decidedBy: col(r, "Decided by") || null,
  }));

  const prioritisation = tableRows("prioritisation", "prioritisation.rows");

  // ---- surroundings ------------------------------------------------------
  const sessionFiles = (await lsIf(join(engagementDir, "chronicle", "sessions")))
    .filter((f) => /^\d{4}-\d{2}-\d{2}-\d+\.md$/.test(f)).sort();
  const latest = sessionFiles.at(-1) ?? null;
  let latestSummary: string | null = null;
  if (latest) {
    const md = await readIf(join(engagementDir, "chronicle", "sessions", latest));
    const m = md?.match(/##\s*Summary\s*\n+([^\n#]+)/);
    latestSummary = m ? m[1]!.trim() : null;
  }

  const eventFiles = (await lsIf(join(engagementDir, "chronicle", "run-events")))
    .filter((f) => f.endsWith(".json")).sort();
  const byAgent: Record<string, number> = {};
  for (const f of eventFiles) {
    const raw = await readIf(join(engagementDir, "chronicle", "run-events", f));
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const e of arr) {
        const a = (e as { agent?: string }).agent;
        if (a) byAgent[a] = (byAgent[a] ?? 0) + 1;
      }
    } catch { /* a malformed event is reported by the caller, not silently counted */ }
  }

  const feedbackFiles = await lsIf(join(engagementDir, "harness-improver", "feedback"));
  let withEntries = 0;
  let pendingPromptEdits = 0;
  for (const f of feedbackFiles) {
    const md = await readIf(join(engagementDir, "harness-improver", "feedback", f));
    if (!md) continue;
    if (/^##\s+\d{4}-\d{2}-\d{2}/m.test(md)) withEntries++;
    pendingPromptEdits += (md.match(/proposed prompt edits — not applied/gi) ?? []).length;
  }

  const engagementSkills = (await lsIf(join(engagementDir, "skills-engagement")))
    .filter((f) => !f.startsWith("."));
  let practice = 0, fn = 0;
  if (opts.harnessRoot) {
    practice = (await lsIf(join(opts.harnessRoot, ".claude", "skills", "skills-practice"))).length;
    fn = (await lsIf(join(opts.harnessRoot, ".claude", "skills", "skills-function"))).length;
  }

  const datasources: State["datasources"] = [];
  if (opts.datasourcesDir) {
    for (const f of await lsIf(join(opts.datasourcesDir, slug))) {
      if (f.startsWith(".")) continue;
      let size = 0;
      try { size = (await stat(join(opts.datasourcesDir, slug, f))).size; } catch { /* unreadable */ }
      datasources.push({ name: f, sizeBytes: size, classification: "raw" });
    }
  }

  const deliverables: State["deliverables"] = [];
  if (opts.deliverablesDir) {
    for (const s of STAGES) {
      for (const f of await lsIf(join(opts.deliverablesDir, slug, s.slug))) {
        if (f.endsWith(".html")) {
          deliverables.push({ name: f.replace(/\.html$/, ""), stage: s.slug, rendered: true });
        }
      }
    }
  }

  // ---- engagement identity ----------------------------------------------
  const overview = await readIf(
    join(engagementDir, "chronicle", "memory", "engagement-overview.md"),
  );
  const engagement: Record<string, string> = { slug };
  // An unsubstituted placeholder is not a value. Propagating "{{PHASE}}" into
  // derived state is exactly the silent wrongness this package exists to
  // prevent, so it is dropped here as well as reported by the scaffolder.
  const usable = (v: string) => filled(v) && !/\{\{[A-Z_]+\}\}/.test(v);
  if (overview) {
    for (const t of parseAnchoredTables(overview)) {
      for (const r of t.rows) {
        const k = col(r, "Item"); const v = col(r, "Value");
        if (filled(k) && usable(v)) engagement[k.toLowerCase().replace(/\s+/g, "-")] = v;
      }
    }
    const kv = overview.matchAll(/^\|\s*([A-Za-z][A-Za-z ]+?)\s*\|\s*(.+?)\s*\|$/gm);
    for (const m of kv) {
      const k = m[1]!.trim().toLowerCase().replace(/\s+/g, "-");
      if (k === "item" || /^-+$/.test(k)) continue;
      if (!(k in engagement) && usable(m[2]!)) engagement[k] = m[2]!.trim();
    }
  }

  // Tolerate the earlier key spellings so an engagement created before the
  // template was corrected still renders.
  const alias: Record<string, string> = {
    phase: "stage",
    "labour-representation": "labour",
    "data-residency": "residency",
  };
  for (const [from, to] of Object.entries(alias)) {
    const v = engagement[from];
    if (v !== undefined && engagement[to] === undefined) engagement[to] = v;
  }

  const friction: State["friction"] = [];
  for (const f of sessionFiles.slice(-3)) {
    const md = await readIf(join(engagementDir, "chronicle", "sessions", f));
    const m = md?.match(/##\s*Harness friction\s*\n+([\s\S]*?)(?=\n##\s|\n*$)/);
    const note = m?.[1]?.trim();
    if (note && !/^none\.?$/i.test(note)) friction.push({ session: f.replace(/\.md$/, ""), note });
  }

  // The ontology layer, checked against what the compiler will accept. Only
  // once it has been started — an untouched contract on a stage-01 engagement
  // is not a finding, it is a stage nobody has reached.
  const contractInput = await readContract(engagementDir);
  const contractStarted = contractInput.tables.some((t) => dataRows(t).length > 0);
  const contractFindings = contractStarted ? checkContract(contractInput) : [];

  // Raw material and proposals. Read from disk, not from registers — that is
  // the whole point: this is the work that has not entered the chain yet.
  const { items: intakeItems, unclassified: intakeUnclassified } =
    await scanIntake(engagementDir);
  const intakeByClass: Record<string, number> = {};
  for (const i of intakeItems) {
    intakeByClass[i.evidenceClass] = (intakeByClass[i.evidenceClass] ?? 0) + 1;
  }
  const waitingProposals = await pendingProposals(engagementDir);

  return {
    schemaVersion: SCHEMA_VERSION,
    contractSchema: CONTRACT_SCHEMA,
    generatedAt: now.toISOString(),
    engagement,
    stages,
    gates,
    instruments,
    chain,
    openQuestions,
    raid,
    autonomy,
    prioritisation,
    deliverables,
    datasources,
    skills: { practice, engagement: engagementSkills.length, function: fn, supersedes: [] },
    intake: {
      waiting: intakeItems.length,
      byClass: intakeByClass,
      unclassified: intakeUnclassified,
      needsService: intakeItems.filter((i) => i.handling === "needs-service").length,
      pendingProposals: waitingProposals,
    },
    harnessImprover: {
      lastRun: null, openProposals: 0,
      feedbackFilesWithEntries: withEntries, pendingPromptEdits,
    },
    sessions: {
      count: sessionFiles.length,
      latest: latest ? latest.replace(/\.md$/, "") : null,
      latestDate: latest ? latest.slice(0, 10) : null,
      latestSummary,
    },
    runEvents: {
      count: eventFiles.length,
      latest: eventFiles.at(-1) ?? null,
      byAgent,
    },
    friction,
    roi: computeRoi(tablesByInstrument.get("roi-model") ?? []),
    coach: coach({
      findings: chain.audit.findings,
      gates,
      tables: [...tablesByInstrument.values()].flat(),
      contract: contractFindings,
    }),
  };
}
