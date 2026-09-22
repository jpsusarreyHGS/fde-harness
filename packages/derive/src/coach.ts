/**
 * The coach: findings become questions with a name attached.
 *
 * The audit already knows *which* exception has no rule holder and *which*
 * requirement cites an id that does not exist. What it cannot do is tell an
 * FDE which of forty findings to spend tomorrow morning's ten minutes on.
 * That is this module's whole job.
 *
 * Three things make a finding into a question worth asking:
 *
 *   1. **Someone can answer it.** A question with no name is a note to self.
 *      Roles are resolved to people through the stakeholder map, and a role
 *      with no name behind it becomes its own, higher-ranked question — you
 *      cannot ask the exception holder anything until you know who they are.
 *
 *   2. **Something is blocked by it.** Ranked by joining what the question
 *      blocks to `prioritisation.rows`, so a gap in the top-ranked workflow
 *      outranks an older gap in a workflow nobody chose to automate. Age is
 *      not a proxy for importance and was never a defensible sort.
 *
 *   3. **It gets more expensive to answer later.** An operator's undocumented
 *      rule is elicitable while you are sitting beside them and effectively
 *      gone three weeks after the shadowing ends. A dangling citation costs
 *      minutes now and surfaces at UAT if it survives.
 *
 * Every question carries the reason it ranks where it does. The console has
 * lied about its own sort once already; a ranking that cannot explain itself
 * is one nobody will trust twice.
 */

import { dataRows, findTable, type ParsedTable } from "./anchors.ts";
import type { AuditFinding } from "./chain.ts";
import type { Gate } from "./state.ts";
import type { ContractFinding } from "./contract.ts";
import { idPattern } from "./ids.ts";

export interface CoachQuestion {
  /** Stable within a run, for the console and for `/next`. */
  key: string;
  /** What to actually say. Written to be read aloud, not filed. */
  ask: string;
  /** The role that can answer. */
  who: string;
  /** The person, when the stakeholder map names one. */
  whoName: string | null;
  /** What is waiting on the answer, in the engagement's own words. */
  blocks: string;
  /** Where to write the answer down. */
  location: string;
  /** Why it ranks here — shown, never hidden behind the sort. */
  why: string;
  score: number;
  /**
   * Whether this needs a person, a desk, or a moment's honesty.
   *
   * A dangling citation is a real defect, but nobody at the client can answer
   * it — it is the FDE's own repair. Mixing the two produces a "who to ask
   * tomorrow" list containing items with nobody to ask, which is how a queue
   * loses its meaning.
   *
   * `verify` is a gate criterion whose answer is already on file — the
   * sponsor's sentence in the brief, the five roles named in the map. Asking
   * the FDE for it again teaches them the queue does not read what they
   * wrote. The criterion still stands: they must be able to *say* it.
   */
  work: "ask" | "fix" | "verify";
  source: "gate" | "chain" | "open-question" | "stakeholder" | "contract";
  /** The harness id this is about, where there is one. */
  id: string | null;
}

export interface CoachInput {
  findings: readonly AuditFinding[];
  gates: readonly Gate[];
  tables: readonly ParsedTable[];
  /**
   * Contract-layer refusals, when the ontology layer has been started.
   *
   * These rank above ordinary findings because they are not advice: the
   * downstream compiler will not build past them, so an engagement carrying
   * one has a deadline attached to it that nothing else here does.
   */
  contract?: readonly ContractFinding[];
}

/**
 * How much harder each kind gets to answer once the moment passes.
 *
 * These are not severities. A dangling citation is a worse *defect* than a
 * missing rule holder, but it can be fixed from a desk in November. The rule
 * holder cannot.
 */
const PERISHABILITY: Record<string, number> = {
  "exception-without-rule-holder": 40,
  "gap-without-question": 30,
  "unsourced-requirement": 25,
  "unowned-assumption": 25,
  "orphan-evidence": 15,
  "unverified-in-placement": 20,
  "allocation-without-reason": 15,
  "dangling-citation": 10,
  // Low, deliberately. A hypothesis does not get harder to close over time —
  // it gets harder to *remember why you believed it*, which is what the
  // written disconfirming evidence is for.
  "hypothesis-never-revisited": 20,
};

/** Phrasing that makes a finding sayable out loud. */
const PHRASING: Record<string, (id: string, detail: string) => string> = {
  "exception-without-rule-holder": (id) =>
    `${id}: who actually decides this one? Not the team — the person you go to when it is not obvious.`,
  "unsourced-requirement": (id) =>
    `${id} has no evidence behind it. What did we see that made us write it, or should it be an open question?`,
  "dangling-citation": (id, detail) =>
    `${id} cites evidence that does not exist — ${detail.replace(/\.\s*Usually.*$/, "")}. Which row was meant?`,
  "orphan-evidence": (id) =>
    `${id} was observed and nothing was built on it. Does it matter, or was it noise?`,
  "unowned-assumption": (id) =>
    `${id} is an assumption with nobody's name on it. Who is willing to confirm it?`,
  "unverified-in-placement": (id) =>
    `${id} rests on what someone said, and we are about to place intelligence on it. Can we watch it happen once?`,
  "allocation-without-reason": (id) =>
    `${id} was allocated with no reason recorded. Why this quadrant and not the next one over?`,
  "gap-without-question": (id) =>
    `${id} is a gap that never became an open question. Who would we have to ask?`,
  "hypothesis-never-revisited": (id) =>
    `${id} was written before we watched anything and is still open. Did discovery support it or disprove it?`,
};

/** Kinds nobody at the client can answer — the FDE repairs these. */
// A hypothesis is ours. Nobody at the client can tell us whether we were
// right about what we believed before we arrived.
const DESK_WORK = new Set(["dangling-citation", "allocation-without-reason", "hypothesis-never-revisited"]);

/** Role most likely to hold the answer, by finding kind. */
const OWNER_ROLE: Record<string, string> = {
  "exception-without-rule-holder": "Exception holder",
  "unsourced-requirement": "Process owner",
  "dangling-citation": "FDE",
  "orphan-evidence": "Operator",
  "unowned-assumption": "Process owner",
  "unverified-in-placement": "Operator",
  "allocation-without-reason": "FDE",
  "gap-without-question": "Process owner",
  "hypothesis-never-revisited": "FDE",
};

/**
 * Where a gate's memo actually lives.
 *
 * `G1` → `stage-gate-1-readiness.md`. The obvious construction — `gate-g1.md`
 * — is a file that does not exist, and a queue that tells the operator to
 * write into a nonexistent path teaches them to stop reading the path.
 */
function gateMemo(id: string): string {
  return `engagement-management/stage-gate-${id.replace(/^G/i, "")}-readiness.md`;
}

function cell(r: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const v = r[n];
    if (v !== undefined) return v.trim();
  }
  return "";
}

function has(v: string): boolean {
  return v !== "" && v !== "—" && v !== "-" && v !== "TBD" && v !== "tbd";
}

/**
 * Templates write roles as `**The exception holder**`. Left alone that reaches
 * the operator as "the the exception holder" in bold asterisks, which is the
 * kind of detail that makes a tool feel unfinished even when it is right.
 */
function cleanRole(raw: string): string {
  const s = raw.replace(/[*_`]/g, "").trim().replace(/^the\s+/i, "");
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function rowsOf(tables: readonly ParsedTable[], anchor: string): Record<string, string>[] {
  const t = findTable(tables as ParsedTable[], anchor);
  return t ? dataRows(t) : [];
}

/**
 * Role → person, from the stakeholder map.
 *
 * A role we cannot put a name to is itself the finding — see
 * `stakeholderQuestions` — so this returns null rather than a placeholder.
 */
function nameIndex(tables: readonly ParsedTable[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const anchor of ["stakeholder-map.five-roles", "stakeholder-map.others"]) {
    for (const r of rowsOf(tables, anchor)) {
      const role = cleanRole(cell(r, "Role"));
      const name = cell(r, "Name");
      // Keyed on the cleaned role, because every lookup uses the cleaned form.
      // Keying on the raw `**The executive sponsor**` made every lookup miss.
      if (has(role) && has(name)) idx.set(role.toLowerCase(), name);
    }
  }
  return idx;
}

/**
 * Workflow → priority rank, from the prioritisation table.
 *
 * Rank 1 is the workflow the client chose to do first. A question blocking it
 * is worth more than an older question blocking something nobody ranked.
 */
function priorityIndex(tables: readonly ParsedTable[]): { byWorkflow: Map<string, number>; max: number } {
  const byWorkflow = new Map<string, number>();
  let max = 0;
  for (const r of rowsOf(tables, "prioritisation.rows")) {
    const wf = cell(r, "Workflow");
    const rank = Number.parseInt(cell(r, "Rank"), 10);
    if (!has(wf) || !Number.isFinite(rank)) continue;
    byWorkflow.set(wf.toLowerCase(), rank);
    if (rank > max) max = rank;
  }
  return { byWorkflow, max };
}

/**
 * Score what a question blocks, 0–100.
 *
 * The join is deliberately loose — an FDE writes "claims triage" in one table
 * and "Claims triage (motor)" in another, and refusing to match on that would
 * make the whole ranking silently degrade to zero. A near-match is reported in
 * `why` so the operator can see the join that produced the number.
 */
function blockScore(
  blocks: string,
  prio: { byWorkflow: Map<string, number>; max: number },
): { score: number; why: string | null } {
  if (!has(blocks) || prio.byWorkflow.size === 0) return { score: 0, why: null };
  const hay = blocks.toLowerCase();
  let best: { wf: string; rank: number } | null = null;
  for (const [wf, rank] of prio.byWorkflow) {
    if (!hay.includes(wf) && !wf.includes(hay)) continue;
    if (!best || rank < best.rank) best = { wf, rank };
  }
  if (!best) return { score: 0, why: null };
  // Rank 1 scores 60; the last-ranked workflow scores 10.
  const span = Math.max(1, prio.max - 1);
  const score = Math.round(60 - ((best.rank - 1) / span) * 50);
  return { score, why: `blocks the #${best.rank} workflow (${best.wf})` };
}

/**
 * What the engagement already holds against a gate criterion.
 *
 * The G1 memo's criteria are written from the bootcamp bar, and the coach
 * used to turn each unmet one straight into a question — including "state
 * the sponsor's real problem" on an engagement whose sponsor brief already
 * carried the sentence, verbatim, from a source the FDE had captured. The
 * trainee answered it again in chat; the next `/next` asked again.
 *
 * So before a criterion becomes an `ask`, look in the instrument that would
 * hold its answer. If it is there, the criterion becomes a `verify`: here is
 * what is on file, now say it. The bar has not moved — G1 still requires the
 * sentence to be said, in words that are not the request — but the queue
 * stops pretending it has not read the file.
 */
function onFile(
  criterion: string,
  tables: readonly ParsedTable[],
): { ask: string; location: string } | null {
  const c = criterion.toLowerCase();

  if (/sponsor|real problem|success sentence|trying to accomplish/.test(c)) {
    const restatement = rowsOf(tables, "sponsor-brief.restatement")
      .find((r) => /real problem/i.test(cell(r, "Item")));
    const sentence = restatement ? cell(restatement, "Value") : "";
    const accomplish = rowsOf(tables, "sponsor-brief.questions")
      .find((r) => /trying to accomplish/i.test(cell(r, "Question")));
    const goal = accomplish ? cell(accomplish, "Answer") : "";
    const quote = has(sentence) ? sentence : has(goal) ? goal : "";
    if (!quote) return null;
    return {
      ask:
        `Sponsor's ${has(sentence) ? "real problem" : "goal"} is on file (sponsor-brief.md): "${quote}". ` +
        "At G1 you must be able to say it in one sentence that is *not* the request. Say it now — " +
        "if what comes out is the request reworded, discovery has not happened yet.",
      location: "01-Organisation/sponsor-brief.md",
    };
  }

  if (/stakeholder|five roles|decision rights|process owner|exception holder/.test(c)) {
    const roles = rowsOf(tables, "stakeholder-map.five-roles")
      .map((r) => ({ role: cleanRole(cell(r, "Role")), name: cell(r, "Name") }))
      .filter((r) => has(r.role));
    const named = roles.filter((r) => has(r.name));
    const need = ["process owner", "exception holder"];
    if (!need.every((n) => named.some((r) => r.role.toLowerCase() === n))) return null;
    const missing = roles.filter((r) => !has(r.name)).map((r) => r.role.toLowerCase());
    return {
      ask:
        `${named.length} of the five roles are named on file (stakeholder-map.md): ` +
        `${named.map((r) => `${r.role.toLowerCase()} — ${r.name}`).join("; ")}` +
        `${missing.length ? `; still unnamed: ${missing.join(", ")}` : ""}. ` +
        "Decision rights are defensible when you could state them to the sponsor and they would agree — could you?",
      location: "01-Organisation/stakeholder-map.md",
    };
  }

  if (/systems|readiness|landmine|data/.test(c)) {
    const systems = rowsOf(tables, "systems-inventory.applications")
      .map((r) => cell(r, "System")).filter(has);
    if (!systems.length) return null;
    const scored = rowsOf(tables, "readiness-scorecard.rows").length;
    return {
      ask:
        `${systems.length} system(s) on file (systems-inventory.md): ${systems.slice(0, 6).join(", ")}` +
        `${systems.length > 6 ? ", …" : ""}. Readiness scorecard: ${scored} source(s) scored. ` +
        "A landmine is a named blocker with a named owner — is each amber one there, or only the system?",
      location: "03-Systems/readiness-scorecard.md",
    };
  }

  return null;
}

/**
 * Gate criteria that are not met.
 *
 * These outrank everything else at the same stage: a gate criterion is the
 * client's own definition of ready, and each already carries an owner.
 */
function gateQuestions(
  gates: readonly Gate[],
  names: Map<string, string>,
  tables: readonly ParsedTable[],
): CoachQuestion[] {
  const out: CoachQuestion[] = [];
  // Only the gate you are actually working toward. Every criterion of G2 and
  // G3 is unmet on day one, and a queue that opens with "prove it with evals"
  // on a stage-01 engagement is a queue nobody reads twice.
  const open = gates.filter((g) => g.status !== "passed");
  const current = open.length ? [open[0]!] : [];
  for (const g of current) {
    const unmet = g.criteria.filter((c) => c.status !== "met");
    const unowned = unmet.filter((c) => !has(c.owner));

    // Five unowned criteria are not five conversations — they are one
    // conversation about who owns the gate. Listing them separately buries
    // everything an FDE could actually act on tomorrow.
    if (unowned.length > 1) {
      out.push({
        key: `${g.id}:unowned`,
        ask:
          `${unowned.length} of ${g.id}'s criteria have no owner: ` +
          `${unowned.map((c) => cleanRole(c.name).split(" — ")[0]).join("; ")}. Who owns each?`,
        who: "Executive sponsor",
        whoName: names.get("executive sponsor") ?? null,
        blocks: `${g.id} — ${g.between}`,
        location: gateMemo(g.id),
        why: `${g.id} cannot be assessed while its criteria have nobody to chase`,
        score: 110,
        work: "ask",
        source: "gate",
        id: null,
      });
    }

    for (const c of unmet) {
      if (unowned.length > 1 && !has(c.owner)) continue;
      const who = cleanRole(c.owner) || "Unassigned";
      const label = cleanRole(c.name);
      // Already on file? Then it is the FDE's to say, not the client's to
      // answer — and the FDE is the one who has to say it at the gate.
      const held = onFile(c.name, tables);
      if (held) {
        out.push({
          key: `${g.id}:${c.name}`,
          ask: held.ask,
          who: "FDE",
          whoName: null,
          blocks: `${g.id} — ${g.between}`,
          location: held.location,
          why: `${g.id} criterion; the answer is on file, the bar is being able to say it`,
          score: 100,
          work: "verify",
          source: "gate",
          id: null,
        });
        continue;
      }
      out.push({
        key: `${g.id}:${c.name}`,
        ask: has(c.toClose)
          ? `${label} — ${c.toClose}`
          : `${label}: what would close this?`,
        who,
        whoName: names.get(who.toLowerCase()) ?? null,
        blocks: `${g.id} — ${g.between}`,
        location: gateMemo(g.id),
        why: `${g.id} criterion owned by ${who}`,
        score: 100 + (has(c.toClose) ? 0 : 5),
        work: "ask",
        source: "gate",
        id: null,
      });
    }
  }
  return out;
}

/**
 * Audit findings, phrased and ranked.
 *
 * Findings of the same kind that share an answer are merged. Eight separate
 * "EV-004 was observed and nothing was built on it" lines is the loud-complaint
 * failure mode: it fires hardest exactly when the FDE did the most valuable
 * work, and it drowns the two questions that matter.
 */
const MERGEABLE = new Set(["orphan-evidence", "unverified-in-placement"]);

const MERGED_PHRASING: Record<string, (ids: string[]) => string> = {
  "orphan-evidence": (ids) =>
    `${ids.length} observations nothing was built on (${ids.slice(0, 4).join(", ")}` +
    `${ids.length > 4 ? ", …" : ""}). Walk them back: which mattered, and which were noise?`,
  "unverified-in-placement": (ids) =>
    `${ids.length} requirements resting on what someone said are heading into placement ` +
    `(${ids.slice(0, 4).join(", ")}${ids.length > 4 ? ", …" : ""}). Can we watch any of them happen once?`,
};

function chainQuestions(
  findings: readonly AuditFinding[],
  names: Map<string, string>,
  prio: { byWorkflow: Map<string, number>; max: number },
  blocksById: Map<string, string>,
  alreadyAsked: ReadonlySet<string>,
): CoachQuestion[] {
  const out: CoachQuestion[] = [];
  const merged = new Map<string, AuditFinding[]>();

  for (const f of findings) {
    // The FDE already raised this one. Their wording is better than ours —
    // it carries the client's own vocabulary, and the open question already
    // names who can answer. A desk repair is not covered by asking, so those
    // still stand.
    if (!DESK_WORK.has(f.kind) && alreadyAsked.has(f.id)) continue;
    if (MERGEABLE.has(f.kind)) {
      const list = merged.get(f.kind);
      if (list) list.push(f);
      else merged.set(f.kind, [f]);
      continue;
    }
    const phrase = PHRASING[f.kind];
    const who = cleanRole(OWNER_ROLE[f.kind] ?? "Process owner");
    const blocks = blocksById.get(f.id) ?? "";
    const b = blockScore(blocks, prio);
    const perish = PERISHABILITY[f.kind] ?? 10;
    const work = DESK_WORK.has(f.kind) ? "fix" : "ask";
    out.push({
      key: `${f.kind}:${f.id}`,
      ask: phrase ? phrase(f.id, f.detail) : `${f.id}: ${f.detail}`,
      who: work === "fix" ? "FDE" : who,
      whoName: work === "fix" ? null : (names.get(who.toLowerCase()) ?? null),
      blocks,
      location: f.location,
      why: b.why
        ? `${b.why}; ${f.kind.replace(/-/g, " ")}`
        : `${f.kind.replace(/-/g, " ")} — nothing in prioritisation names what it blocks`,
      score: perish + b.score,
      work,
      source: "chain",
      id: f.id,
    });
  }

  for (const [kind, group] of merged) {
    const ids = group.map((f) => f.id).sort();
    const who = cleanRole(OWNER_ROLE[kind] ?? "Operator");
    // The merged item inherits the strongest block score in the group — one of
    // these blocking the top workflow is enough to make the conversation worth
    // having.
    let bestScore = 0;
    let bestWhy: string | null = null;
    let bestBlocks = "";
    for (const f of group) {
      const blocks = blocksById.get(f.id) ?? "";
      const b = blockScore(blocks, prio);
      if (b.score > bestScore) { bestScore = b.score; bestWhy = b.why; bestBlocks = blocks; }
    }
    const phrase = MERGED_PHRASING[kind];
    out.push({
      key: `${kind}:merged`,
      ask: phrase ? phrase(ids) : `${ids.length} ${kind.replace(/-/g, " ")} findings: ${ids.join(", ")}`,
      who,
      whoName: names.get(who.toLowerCase()) ?? null,
      blocks: bestBlocks,
      location: group[0]!.location,
      why: bestWhy
        ? `${bestWhy}; ${group.length} ${kind.replace(/-/g, " ")} findings`
        : `${group.length} ${kind.replace(/-/g, " ")} findings, merged into one conversation`,
      score: (PERISHABILITY[kind] ?? 10) + bestScore,
      work: "ask",
      source: "chain",
      id: null,
    });
  }

  return out;
}

/** Open questions the FDE already wrote and has not answered. */
function openQuestions(
  tables: readonly ParsedTable[],
  names: Map<string, string>,
  prio: { byWorkflow: Map<string, number>; max: number },
): CoachQuestion[] {
  const out: CoachQuestion[] = [];
  for (const r of rowsOf(tables, "open-questions.rows")) {
    const id = cell(r, "Id");
    if (!has(id)) continue;
    if (has(cell(r, "Answered")) || has(cell(r, "Answer"))) continue;
    const who = cleanRole(cell(r, "Who can answer"));
    const blocks = cell(r, "Blocks");
    const b = blockScore(blocks, prio);
    out.push({
      key: `open-question:${id}`,
      ask: `${id}: ${cell(r, "Question")}`,
      who: has(who) ? who : "Unassigned",
      whoName: has(who) ? (names.get(who.toLowerCase()) ?? null) : null,
      blocks,
      location: "02-Workflow/open-questions.md",
      why: b.why
        ? `${b.why}; open since ${cell(r, "Raised") || "unrecorded"}`
        : has(blocks)
          ? `blocks "${blocks}", which prioritisation does not rank`
          : "open question with nothing recorded as blocked — say what it blocks or close it",
      // An unanswered question nobody can answer is the worst kind: it will
      // sit there through the whole engagement unless someone is named.
      score: 20 + b.score + (has(who) ? 0 : 15),
      work: "ask",
      source: "open-question",
      id,
    });
  }
  return out;
}

/**
 * Roles the map does not name.
 *
 * Ranked above the questions that need them: every "ask the exception holder"
 * is unactionable until this one is answered.
 */
function stakeholderQuestions(tables: readonly ParsedTable[]): CoachQuestion[] {
  const out: CoachQuestion[] = [];
  for (const r of rowsOf(tables, "stakeholder-map.five-roles")) {
    const raw = cell(r, "Role");
    if (!has(raw) || has(cell(r, "Name"))) continue;
    const role = cleanRole(raw);
    out.push({
      key: `stakeholder:${role}`,
      ask: `Who is the ${role.toLowerCase()}? A name, not a team.`,
      who: "Executive sponsor",
      whoName: null,
      blocks: `every question that needs the ${role.toLowerCase()}`,
      location: "01-Organisation/stakeholder-map.md",
      why: `one of the five roles, unnamed — ${role.toLowerCase()} questions cannot be asked until it is`,
      score: 70,
      work: "ask",
      source: "stakeholder",
      id: null,
    });
  }
  return out;
}

/**
 * Contract refusals, as questions.
 *
 * `checkContract` already produces the role and the file; the work here is
 * ranking. A refusal scores above every chain finding and below a gate
 * criterion — the gate is the client's definition of ready, but a refusal is
 * a build that will not happen.
 */
function contractQuestions(
  findings: readonly ContractFinding[],
  names: Map<string, string>,
): CoachQuestion[] {
  const out: CoachQuestion[] = [];
  for (const f of findings) {
    if (f.severity !== "refuse") continue;
    const who = cleanRole(f.who ?? "Process owner");
    out.push({
      key: `contract:${f.code}:${f.where}`,
      ask: f.detail,
      who,
      whoName: names.get(who.toLowerCase()) ?? null,
      blocks: "the ontology compile",
      location: f.location ?? f.where,
      why: `the ontology compiler refuses on ${f.code.replace(/-/g, " ")}`,
      score: 90,
      // A missing owner is a person to ask. A dangling id or a renamed anchor
      // is ours to repair, and nobody at the client can help.
      work: f.who ? "ask" : "fix",
      source: "contract",
      id: null,
    });
  }
  return out;
}

/**
 * Build the ranked queue.
 *
 * Ties break by key so two runs over unchanged files produce the same order —
 * a queue that reshuffles itself is one an FDE stops believing.
 */
export function coach(input: CoachInput): CoachQuestion[] {
  const names = nameIndex(input.tables);
  const prio = priorityIndex(input.tables);

  // What each id blocks, taken from the open-question row that mentions it.
  // This is how a finding about EX-002 inherits "blocks claims triage".
  const blocksById = new Map<string, string>();
  // Ids the FDE has already written a question about. Asking the same thing
  // again in the harness's words, right next to their own, makes the queue
  // look like it is not reading what they wrote.
  const alreadyAsked = new Set<string>();
  for (const r of rowsOf(input.tables, "open-questions.rows")) {
    const answered = has(cell(r, "Answered")) || has(cell(r, "Answer"));
    const blocks = cell(r, "Blocks");
    const text = `${cell(r, "Question")} ${cell(r, "Why it matters")} ${blocks}`;
    for (const m of text.matchAll(idPattern())) {
      if (has(blocks) && !blocksById.has(m[1]!)) blocksById.set(m[1]!, blocks);
      if (!answered) alreadyAsked.add(m[1]!);
    }
  }

  const all = [
    ...gateQuestions(input.gates, names, input.tables),
    ...contractQuestions(input.contract ?? [], names),
    ...stakeholderQuestions(input.tables),
    ...chainQuestions(input.findings, names, prio, blocksById, alreadyAsked),
    ...openQuestions(input.tables, names, prio),
  ];

  // Two findings about the same id are one conversation. Keep the higher.
  const best = new Map<string, CoachQuestion>();
  for (const q of all) {
    const prev = best.get(q.key);
    if (!prev || q.score > prev.score) best.set(q.key, q);
  }

  return [...best.values()].sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

/**
 * The three things to ask tomorrow, grouped by who to ask.
 *
 * Grouped rather than listed because an FDE gets one conversation with the
 * exception holder, not three — walking in with all their questions at once
 * is the difference between one interruption and three.
 */
export function nextConversations(
  questions: readonly CoachQuestion[],
  limit = 3,
): { who: string; whoName: string | null; questions: CoachQuestion[] }[] {
  const byWho = new Map<string, CoachQuestion[]>();
  for (const q of questions) {
    if (q.work !== "ask") continue;
    const list = byWho.get(q.who);
    if (list) list.push(q);
    else byWho.set(q.who, [q]);
  }
  return [...byWho.entries()]
    .map(([who, qs]) => ({ who, whoName: qs[0]!.whoName, questions: qs }))
    .sort((a, b) => b.questions[0]!.score - a.questions[0]!.score)
    .slice(0, limit);
}

/**
 * Repairs only the FDE can make — no client conversation will resolve these.
 *
 * Kept out of the conversation list on purpose: a queue of things to ask that
 * contains items with nobody to ask is a queue people stop trusting.
 */
export function deskWork(questions: readonly CoachQuestion[]): CoachQuestion[] {
  return questions.filter((q) => q.work === "fix");
}

/**
 * Gate criteria whose answer is already on file.
 *
 * Printed before the conversations, because they cost nothing to close —
 * the FDE reads what they captured and says it back — and because a queue
 * that opens by asking for something it is holding is one nobody trusts twice.
 */
export function verifyFirst(questions: readonly CoachQuestion[]): CoachQuestion[] {
  return questions.filter((q) => q.work === "verify");
}
