/**
 * Sweep: the deterministic floor under an extraction.
 *
 * `/capture` is a model reading a source and proposing rows. A model that has
 * just read forty observation rows out of a shift note is prone to stopping
 * there, and the things it skips are exactly the ones the stage-01 and
 * stage-03 instruments need: the four people the transcript named, the three
 * systems, the one sentence in which the sponsor said what success is. In the
 * first field simulation a source naming four stakeholders produced a
 * stakeholder map holding one, and the FDE was then asked at the gate for a
 * name the harness had already read.
 *
 * This module does the cheap, regex-level part of that sweep: capitalised
 * names next to role words, nouns that name systems, figures with a unit. It
 * is a **hint, not a proposer** — it writes nothing and it is expected to be
 * wrong at the edges. Its job is to give the coverage report a number to
 * compare against, so that "stakeholder-map: 0 rows" against a source naming
 * four people is visible at the moment it happens rather than at the gate.
 */

import { INSTRUMENTS } from "./instruments.ts";

export interface SweptPerson {
  name: string;
  /** The role phrase found beside the name, or null when only the name was. */
  role: string | null;
}

export interface SweepResult {
  people: SweptPerson[];
  systems: string[];
  /** Acronyms and coded values — candidates for the vocabulary audit. */
  terms: string[];
  /** Figures carrying a unit or a period. */
  figures: string[];
  /** The source mentions a sponsor, or the named sponsor, by name or by word. */
  sponsorMentioned: boolean;
}

// Words that, next to a capitalised name, make it a person with a role.
// Ordered so multi-word phrases match before their last word would.
const ROLE_WORDS = [
  "executive sponsor", "business analyst", "vice president", "team lead", "head of",
  "process owner", "data owner", "product owner", "systems gatekeeper",
  "sponsor", "manager", "director", "vp", "analyst", "coordinator", "supervisor",
  "owner", "representative", "rep", "engineer", "officer", "chief", "ceo", "cfo",
  "coo", "cio", "cto", "controller", "clerk", "specialist", "administrator",
  "admin", "architect", "operator", "planner", "buyer", "accountant", "associate",
  "assistant", "partner", "consultant", "president", "founder", "steward",
  "dispatcher", "scheduler", "nurse", "physician", "technician", "developer",
  "gatekeeper", "adjudicator", "underwriter", "handler", "auditor",
];

// Nouns that name a place work happens. Matched whole-word, case-insensitive;
// reported in the spelling given here.
const SYSTEMS = [
  "TMS", "WMS", "ERP", "CRM", "SAP", "Oracle", "Salesforce", "Dynamics", "NetSuite",
  "Workday", "ServiceNow", "Jira", "Zendesk", "HubSpot", "Epic", "Cerner", "Guidewire",
  "Duck Creek", "Outlook", "Gmail", "mailbox", "inbox", "email", "Teams", "Slack",
  "WhatsApp", "SharePoint", "OneDrive", "Excel", "spreadsheet", "Power BI", "Tableau",
  "Snowflake", "Databricks", "Fabric", "BigQuery", "Redshift", "Postgres", "SQL Server",
  "MySQL", "MongoDB", "portal", "fax", "EDI", "data warehouse", "data lake", "mainframe",
  "AS400", "QuickBooks", "Xero", "Concur", "Coupa", "Ariba", "DocuSign", "Dropbox",
  "Google Drive", "Confluence", "Notion", "Trello", "Asana", "Smartsheet", "Access",
];

const CASE_SENSITIVE = new Set(["Access", "Teams", "Epic", "Fabric", "Notion", "Concur", "Dynamics", "Oracle"]);

// Capitalised tokens that are never a person.
const NOT_A_NAME = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "i", "we", "you", "they", "he", "she", "it", "the", "a", "an", "and", "or", "but",
  "if", "so", "then", "when", "where", "what", "which", "who", "how", "why", "yes", "no",
  "ok", "okay", "right", "well", "also", "asked", "note", "notes", "reminder", "shift",
  "operator", "consent", "agreed", "early", "customer", "booking", "bookings", "driver",
  "carrier", "vehicle", "photographed", "shadowing", "observed", "stated", "documented",
  "system", "interview", "call", "transcript", "meeting", "session", "webvtt",
  // Headings a note-taker types before a colon.
  "present", "open", "summary", "context", "attendees", "agenda", "actions",
  "outcome", "outcomes", "background", "result", "results", "decision", "decisions",
  "question", "questions", "answer", "next", "notes", "todo", "date", "time", "re",
]);

// Acronyms that are punctuation to a reader, not vocabulary.
const NOT_A_TERM = new Set([
  "FDE", "HGS", "OK", "JP", "AM", "PM", "UK", "US", "USA", "EU", "ID", "NB", "PS",
  "FYI", "ASAP", "TBD", "NA", "TODO", "WEBVTT", "NOTE", "IT", "AI", "HR", "QA",
]);

// Two letters before any apostrophe, so "I'm" and "I'd" are not names.
const NAME = "[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ][a-zà-öø-ÿ'’-]*";
const FULL_NAME = `${NAME}(?:\\s+${NAME}){0,2}`;
// A role phrase stops at punctuation, a colon and a paragraph break — but
// not at a single line wrap, which is what a note-taker's Enter key produces.
const PHRASE = "[^,.;:()|\\n]";

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ROLE_RE = new RegExp(`\\b(?:${ROLE_WORDS.map(esc).join("|")})\\b`, "i");

/**
 * Speech only: voice tags and speaker labels come out first, timing goes.
 *
 * Lines wrapped inside a paragraph are rejoined with a space, so a role
 * phrase broken by a note-taker's Enter key still reads as one phrase, while
 * a blank line stays a paragraph break the phrase patterns will not cross.
 */
function speech(raw: string): { text: string; speakers: string[] } {
  const speakers: string[] = [];
  const paras: string[][] = [[]];
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (s === "WEBVTT" || s.startsWith("NOTE ") || /^\d+$/.test(s) || /-->/.test(s)) continue;
    if (!s) {
      if (paras.at(-1)!.length) paras.push([]);
      continue;
    }
    for (const m of s.matchAll(/<v\s+([^>]+)>/g)) speakers.push(m[1]!.trim());
    const label = new RegExp(`^(${FULL_NAME})\\s*[:—–]\\s+`).exec(s);
    if (label) speakers.push(label[1]!);
    paras.at(-1)!.push(s.replace(/<[^>]+>/g, "").trim());
  }
  return { text: paras.filter((p) => p.length).map((p) => p.join(" ")).join("\n"), speakers };
}

function trimRole(phrase: string): string | null {
  const m = ROLE_RE.exec(phrase);
  if (!m) return null;
  // Keep from the start of the phrase to the end of the role word plus at most
  // two following words — "VP Finance" and "booking coordinator" survive,
  // "coordinator, 11 years" loses the tail.
  const end = m.index + m[0].length;
  const tail = phrase.slice(end).match(/^(?:\s+[A-Za-z&/]+){0,2}/)?.[0] ?? "";
  return phrase.slice(0, end + tail.length).replace(/^\s*(?:the|our|their|a|an)\s+/i, "").trim();
}

function firstToken(name: string): string {
  return name.split(/\s+/)[0]!.toLowerCase();
}

/**
 * What a source names, at regex fidelity.
 *
 * Give it the raw file — WebVTT voice tags are read before the timing is
 * stripped, because `<v Marta Oyelaran>` is the only place a transcript
 * reliably names its speakers.
 */
export function sweepText(raw: string, opts: { sponsorName?: string } = {}): SweepResult {
  const { text, speakers } = speech(raw);
  const people = new Map<string, SweptPerson>();

  const remember = (name: string, role: string | null) => {
    const clean = name.trim();
    if (!clean || NOT_A_NAME.has(clean.toLowerCase())) return;
    // "Marta" and "Marta Oyelaran" are one person. Keep the fuller name and
    // whichever mention carried a role.
    const key = firstToken(clean);
    const prev = people.get(key);
    if (!prev) {
      people.set(key, { name: clean, role });
      return;
    }
    if (clean.length > prev.name.length) prev.name = clean;
    if (!prev.role && role) prev.role = role;
  };

  // Name, then role: "Tomasz Nowak, booking coordinator" · "Dawn (union rep)"
  // · "Marta Oyelaran — VP Operations". A line break inside the role phrase
  // is just a note-taker's wrap.
  for (const m of text.matchAll(new RegExp(`(${FULL_NAME})\\s*[,(—–-]\\s*(${PHRASE}{2,60})`, "g"))) {
    const role = trimRole(m[2]!);
    if (role) remember(m[1]!, role);
  }
  // Name, verb, role: "Yusuf is the ADR lead" · "Priya was our deductions manager".
  for (const m of text.matchAll(new RegExp(`(${FULL_NAME})\\s+(?:is|was|as)\\s+(${PHRASE}{2,50})`, "g"))) {
    const role = trimRole(m[2]!);
    if (role) remember(m[1]!, role);
  }
  // Role, then name: "the deductions manager, Priya Shah" · "our VP Finance Dana Whitfield".
  for (const m of text.matchAll(new RegExp(`\\b(?:the|our|their)\\s+([a-z][a-z &/-]{2,40}?)\\s*[,:(—–-]?\\s+(${FULL_NAME})\\b`, "g"))) {
    const role = trimRole(m[1]!);
    if (role) remember(m[2]!, role);
  }
  for (const s of speakers) remember(s, null);

  // Bare mentions mid-sentence: "goes to Marta", "forwards to Yusuf". The
  // word before must be a whole lower-case word, so a surname is not split
  // off its first name. A capitalised word that also appears in lower case
  // somewhere in the text is a common noun that started a clause, not a name.
  const systemWords = new Set(SYSTEMS.map((s) => s.toLowerCase()));
  for (const m of text.matchAll(new RegExp(`(?<=(?:^|\\s)[a-z][a-z'’]*[,;:]?\\s+)(${NAME})(?=[\\s.,;:!?)]|$)`, "gm"))) {
    const w = m[1]!;
    const lw = w.toLowerCase();
    if (NOT_A_NAME.has(lw) || systemWords.has(lw)) continue;
    // Take the capitalised mentions out, then look for the word in lower case.
    const rest = text.replace(new RegExp(`\\b${esc(w)}\\b`, "g"), "").toLowerCase();
    if (new RegExp(`(?<![A-Za-z])${esc(lw)}(?![A-Za-z])`).test(rest)) continue;
    remember(w, null);
  }

  const systems: string[] = [];
  for (const s of SYSTEMS) {
    // Product names that are also ordinary words only count when capitalised:
    // "access to SAP" is not Microsoft Access, and "the teams" is not Teams.
    const flags = CASE_SENSITIVE.has(s) ? "" : "i";
    if (new RegExp(`(?<![A-Za-z0-9])${esc(s)}(?![A-Za-z0-9])`, flags).test(text)) systems.push(s);
  }
  const foundSystems = new Set(systems.map((s) => s.toUpperCase()));

  const terms = new Set<string>();
  for (const m of text.matchAll(/(?<![A-Za-z0-9-])([A-Z][A-Z0-9]{1,5})(?![A-Za-z0-9]|-\d)/g)) {
    const t = m[1]!;
    if (NOT_A_TERM.has(t) || foundSystems.has(t) || /^\d+$/.test(t)) continue;
    terms.add(t);
  }

  const figures = new Set<string>();
  const FIGURE_RES = [
    /[£$€]\s?\d[\d,.]*\s?(?:k|m|bn|million|thousand|billion)?\b/gi,
    /\b\d[\d,.]*\s?%/g,
    /\b\d[\d,.]*\s+(?:a|per|each|every)\s+(?:day|week|month|year|hour|shift|quarter)\b/gi,
    /\b\d[\d,.]*\s+(?:minutes?|mins?|hours?|hrs?|seconds?|secs?|days?|weeks?|months?|years?)\b/gi,
    // Case-sensitive on purpose: "06:11  Booking arrives" is a timestamp, not
    // eleven bookings.
    /\b\d[\d,.]*[\s-]+(?:line|row|record|page|item|case|claim|booking|request|order|ticket|invoice|email|call|fax|deduction|amendment|exception|pallet)s?\b/g,
    /\b(?:[a-z]+\s+){1,2}(?:hundred|thousand|million)(?:\s+(?:and\s+)?[a-z]+){0,2}\b/gi,
  ];
  for (const re of FIGURE_RES) {
    for (const m of text.matchAll(re)) {
      const f = m[0].replace(/\s+/g, " ").trim();
      if (f) figures.add(f);
    }
  }

  // The sponsor may only appear as a voice tag — they are usually the one
  // talking — so the speakers count as text here.
  const haystack = `${text}\n${speakers.join("\n")}`;
  let sponsorMentioned = /\bsponsor\b/i.test(haystack);
  if (!sponsorMentioned && opts.sponsorName) {
    const tokens = opts.sponsorName
      .split(/[\s,()]+/)
      .filter((t) => t.length >= 3 && !ROLE_RE.test(t) && !/^(?:and|the|of)$/i.test(t));
    sponsorMentioned = tokens.some((t) => new RegExp(`\\b${esc(t)}\\b`, "i").test(haystack));
  }

  return {
    people: [...people.values()].sort((a, b) => Number(!!b.role) - Number(!!a.role) || a.name.localeCompare(b.name)),
    systems,
    terms: [...terms].sort(),
    figures: [...figures],
    sponsorMentioned,
  };
}

// ------------------------------------------------------------------ coverage

/**
 * The instruments the transcribe lane may propose into, in stage order, with
 * the sweep signal — if any — that says whether the source plausibly
 * supported rows there.
 */
export const TRANSCRIBE_TARGETS: readonly {
  id: string;
  signal?: "people" | "sponsor" | "systems" | "terms";
}[] = [
  { id: "stakeholder-map", signal: "people" },
  { id: "sponsor-brief", signal: "sponsor" },
  { id: "observation-log" },
  { id: "operating-map" },
  { id: "exception-register" },
  { id: "requirements-register" },
  { id: "open-questions" },
  { id: "systems-inventory", signal: "systems" },
  { id: "readiness-scorecard" },
  { id: "vocabulary-audit", signal: "terms" },
  { id: "ontology-backlog" },
] as const;

export interface CoverageLine {
  id: string;
  rows: number;
  unit: "rows" | "fields";
  /** What the sweep found for this instrument, or null when it has no signal. */
  signal: number | null;
  /** The sweep's finding in words, e.g. "source named 4 people". */
  found: string | null;
  /** True when the source plausibly supported rows and none were proposed. */
  check: boolean;
}

function signalOf(sweep: SweepResult, kind: NonNullable<(typeof TRANSCRIBE_TARGETS)[number]["signal"]>): { n: number; found: string } {
  switch (kind) {
    case "people": return { n: sweep.people.length, found: `source named ${sweep.people.length} ${sweep.people.length === 1 ? "person" : "people"}` };
    case "systems": return { n: sweep.systems.length, found: `source named ${sweep.systems.length} system${sweep.systems.length === 1 ? "" : "s"}` };
    case "terms": return { n: sweep.terms.length, found: `source has ${sweep.terms.length} acronym${sweep.terms.length === 1 ? "" : "s"}/term${sweep.terms.length === 1 ? "" : "s"}` };
    case "sponsor": return sweep.sponsorMentioned
      ? { n: 1, found: "source contains a sponsor" }
      : { n: 0, found: "no sponsor mentioned" };
  }
}

/**
 * Rows proposed per instrument, against what the sweep found.
 *
 * The flag fires only when the sweep found something and nothing was
 * proposed. A source naming nobody producing zero stakeholder rows is
 * correct, and flagging it would teach people to ignore the flag.
 */
export function coverage(
  blocks: readonly { instrument: string; rows: number }[],
  sweep: SweepResult,
): CoverageLine[] {
  const byPath = new Map(INSTRUMENTS.map((i) => [i.path, i]));
  const rowsById = new Map<string, number>();
  for (const b of blocks) {
    const def = byPath.get(b.instrument);
    if (!def) continue;
    rowsById.set(def.id, (rowsById.get(def.id) ?? 0) + b.rows);
  }
  return TRANSCRIBE_TARGETS.map((t) => {
    const rows = rowsById.get(t.id) ?? 0;
    const unit: CoverageLine["unit"] = INSTRUMENTS.find((i) => i.id === t.id)?.coverageMode === "fields" ? "fields" : "rows";
    if (!t.signal) return { id: t.id, rows, unit, signal: null, found: null, check: false };
    const s = signalOf(sweep, t.signal);
    return { id: t.id, rows, unit, signal: s.n, found: s.found, check: s.n > 0 && rows === 0 };
  });
}

// ---------------------------------------------------------------- formatting

export function formatSweep(r: SweepResult, source: string, evidenceClass?: string): string {
  const out: string[] = [];
  out.push(`SWEEP — ${source}${evidenceClass ? ` (${evidenceClass})` : ""} — a floor, not a proposal; nothing written`);
  out.push("");
  const withRole = r.people.filter((p) => p.role);
  const bare = r.people.filter((p) => !p.role);
  out.push(`People named (${r.people.length})`.padEnd(38) + "→ stakeholder-map: the five roles by fill, others as rows");
  for (const p of withRole) out.push(`  ${p.name} — ${p.role}`);
  for (const p of bare) out.push(`  ${p.name} — role not stated here`);
  if (!r.people.length) out.push("  none");
  out.push("");
  out.push(`Systems named (${r.systems.length})`.padEnd(38) + "→ systems-inventory.applications");
  out.push(r.systems.length ? `  ${r.systems.join(" · ")}` : "  none");
  out.push("");
  out.push(`Acronyms / coded terms (${r.terms.length})`.padEnd(38) + "→ vocabulary-audit.terms, if the client uses them");
  out.push(r.terms.length ? `  ${r.terms.join(" · ")}` : "  none");
  out.push("");
  out.push(`Figures with a unit (${r.figures.length})`.padEnd(38) + "→ operating-map.volume · exception-register Frequency · value-hypothesis");
  const shown = r.figures.slice(0, 12);
  out.push(shown.length ? `  ${shown.map((f) => `"${f}"`).join(", ")}${r.figures.length > shown.length ? `, … and ${r.figures.length - shown.length} more` : ""}` : "  none");
  out.push("");
  out.push(`Sponsor`.padEnd(38) + `→ sponsor-brief: ${r.sponsorMentioned ? "mentioned — quote what they said success looks like, verbatim" : "not mentioned in this source"}`);
  return out.join("\n");
}

export function formatCoverage(lines: readonly CoverageLine[], proposal: string, source: string): string {
  const out: string[] = [`COVERAGE — ${proposal} against ${source}`, ""];
  for (const l of lines) {
    const count = `${l.rows} ${l.unit}${l.rows > 0 ? " proposed" : ""}`;
    let note = "";
    if (l.check) note = `← ${l.found}; nothing extracted. Check.`;
    else if (l.found) note = `(${l.found})`;
    out.push(`  ${l.id.padEnd(22)} ${count.padEnd(18)} ${note}`.trimEnd());
  }
  const flagged = lines.filter((l) => l.check).length;
  out.push("");
  out.push(
    flagged
      ? `${flagged} instrument(s) the source plausibly supported got nothing. Re-read for them before you report, or say why not.`
      : "Nothing the sweep found went unextracted. The sweep is a floor — what it cannot see is still yours to find.",
  );
  return out.join("\n");
}
