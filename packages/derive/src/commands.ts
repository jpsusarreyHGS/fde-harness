/**
 * `/commands` — what is available, in stage order, and what to run next.
 *
 * FDEs kept opening the GitHub README to find out which command came next.
 * The answer should come from the checkout they are in, and it should be
 * generated: every command's description already lives in its own file's
 * frontmatter, so this reads those rather than keeping a second list that
 * drifts. The only thing hand-kept is the stage order — and a test refuses a
 * command file that has no place in it.
 *
 * With an engagement, it also says where you are: derived from the same
 * state the dashboard renders, never from what a session remembers.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { State } from "./state.ts";

export interface CommandInfo {
  /** Slash name, e.g. "capture". */
  name: string;
  /** The description from the command file's frontmatter. */
  description: string;
  /** The first sentence — "Stage 04.", "Any stage." — kept as the badge. */
  when: string;
  /** Where it sits in the stage walk. */
  group: string;
}

/**
 * The stage walk. A command appears once, where an FDE first needs it.
 * Add a command here when you add its file; the test enforces both ways.
 */
export const COMMAND_ORDER: readonly { group: string; commands: readonly string[] }[] = [
  { group: "00 · Before you land", commands: ["init-engagement"] },
  { group: "01–03 · Discovery", commands: ["capture", "discover", "ontology"] },
  { group: "Any time during discovery", commands: ["next", "sketch", "mockup", "dashboard"] },
  { group: "G1 · Discovery gate", commands: ["gate"] },
  { group: "04 · Place the intelligence", commands: ["allocate"] },
  { group: "05 · Build the MVP", commands: ["architect", "build"] },
  { group: "06–07 · Prove it, ship it", commands: ["evaluate"] },
  { group: "08 · Calculate the ROI", commands: ["roi"] },
  { group: "Any time", commands: ["render", "chronicle"] },
  { group: "09 · Run the loop again", commands: ["harness-improver"] },
  { group: "Meta", commands: ["commands"] },
] as const;

/** Read every command file's frontmatter. */
export async function readCommands(harnessRoot: string): Promise<CommandInfo[]> {
  const dir = join(harnessRoot, ".claude", "commands");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  const groupOf = new Map<string, string>();
  for (const g of COMMAND_ORDER) for (const c of g.commands) groupOf.set(c, g.group);
  const out: CommandInfo[] = [];
  for (const f of files) {
    const md = await readFile(join(dir, f), "utf8");
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
    const desc = fm ? (/^description:\s*(.+)$/m.exec(fm[1]!)?.[1]?.trim() ?? "") : "";
    const name = f.replace(/\.md$/, "");
    const when = /^(Stages?\s[^.]+\.|Any[^.]+\.|Gates?\s[^.]+\.|The three conversations[^.]*\.)/.exec(desc)?.[1] ?? "";
    out.push({ name, description: desc, when, group: groupOf.get(name) ?? "" });
  }
  return out;
}

/** Commands in stage order, grouped. Unplaced ones are returned separately so a caller can complain. */
export function groupCommands(cmds: readonly CommandInfo[]): { groups: { group: string; commands: CommandInfo[] }[]; unplaced: string[] } {
  const byName = new Map(cmds.map((c) => [c.name, c]));
  const groups = COMMAND_ORDER.map((g) => ({
    group: g.group,
    commands: g.commands.map((n) => byName.get(n)).filter((c): c is CommandInfo => !!c),
  })).filter((g) => g.commands.length);
  const placed = new Set(COMMAND_ORDER.flatMap((g) => g.commands));
  return { groups, unplaced: cmds.map((c) => c.name).filter((n) => !placed.has(n)) };
}

export interface Suggestion {
  command: string;
  why: string;
}

/**
 * Where the engagement is, and the next one to three commands — each with
 * the reason, in the order to run them. The heuristics are deliberately
 * plain and every one names the fact it rests on, so an FDE who disagrees
 * can see what to fix rather than argue with a verdict.
 */
export function suggestNext(s: State): { where: string; next: Suggestion[] } {
  const next: Suggestion[] = [];
  const it = s.intake;
  const g1 = s.gates.find((g) => g.id === "G1");
  const g2 = s.gates.find((g) => g.id === "G2");
  const g3 = s.gates.find((g) => g.id === "G3");
  const rows = (id: string) => s.instruments.find((i) => i.id === id)?.rows ?? 0;
  const discoveryRows = s.instruments.filter((i) => ["01", "02", "03"].includes(i.stage) && i.id !== "open-questions").reduce((n, i) => n + i.rows, 0);
  const terms = s.instruments.find((i) => i.id === "evidence-handling-terms");
  const termsSigned = (terms?.rows ?? 0) >= 6;

  let where: string;
  if (g3?.status === "passed") where = "Past G3 — stage 09, the loop.";
  else if (g2?.status === "passed") where = "Past G2 — stages 07–08, production and ROI.";
  else if (g1?.status === "passed") where = "Past G1 — stages 04–06, placement, build and evals.";
  else if (discoveryRows === 0) where = "Day one — nothing accepted into a discovery instrument yet.";
  else where = `Discovery — ${discoveryRows} accepted row(s) across stages 01–03; G1 ${g1?.status === "not-run" ? "not yet assessed" : g1?.status ?? "not run"}.`;

  // Material and proposals beat everything: they are work nobody has seen.
  if (it.unclassified.length) next.push({ command: "move the file(s) into a class folder", why: `${it.unclassified.length} file(s) sit in evidence/ outside observed/, system/, documented/ or stated/ — the class is never guessed` });
  if (it.pendingProposals.length) next.push({ command: "node packages/derive/src/cli.ts pending … · then accept", why: `${it.pendingProposals.length} file(s) of proposed rows are waiting — nothing reaches a register until you accept` });
  if (it.waiting) next.push({ command: "/capture", why: `${it.waiting} file(s) in evidence/ no register has seen` });

  if (!termsSigned && g1?.status !== "passed") {
    next.push({ command: "sign 00-Setup/evidence-handling-terms.md", why: "capture is hard-stopped until the six terms are settled — evidence taken under unresolved terms may have to be destroyed" });
  }

  if (g1?.status !== "passed") {
    if (discoveryRows === 0 && !it.waiting && !it.pendingProposals.length) {
      next.push({ command: "go and watch, then drop what you produced in evidence/<class>/", why: "eight hours beside the operator gets you the job; the harness structures what you bring back" });
    }
    if (discoveryRows > 0) {
      next.push({ command: "/next", why: "the conversations to have tomorrow, with names — and what is already on file to verify" });
      if (!s.sketches.length) next.push({ command: "/sketch", why: "something to put in front of the sponsor before G1 — what we heard, badged by evidence class" });
      if (rows("operating-map") > 0 && rows("exception-register") > 0 && rows("stakeholder-map") + rows("systems-inventory") > 0 && g1?.status === "not-run") {
        next.push({ command: "/gate 1", why: "map, exceptions and the organisation have rows — assess the discovery gate; expect NOT READY on a compressed engagement, and that is fine" });
      }
    }
  } else if (g2?.status !== "passed") {
    if (rows("allocation-grid") === 0) next.push({ command: "/allocate", why: "G1 passed and no step has been placed — the grid, the ranking and the declines come next" });
    else if (rows("architecture") === 0) next.push({ command: "/architect", why: "steps are placed; no architecture yet" });
    else if (s.chain.evalCases.total === 0) next.push({ command: "/build · then /evaluate", why: "architecture exists; no eval cases yet — the build loop and the four tests" });
    else next.push({ command: "/gate 2", why: `${s.chain.evalCases.passing} of ${s.chain.evalCases.total} eval cases passing — assess the build gate` });
    if (!s.mockups.length) next.push({ command: "/mockup", why: "nothing has been shown to a stakeholder yet — a concept page draws corrections before the build commits to them" });
  } else if (g3?.status !== "passed") {
    if (!s.autonomy.length) next.push({ command: "/evaluate", why: "no rung has been measured — shadow-mode agreement earns the ladder" });
    if (s.roi.measured < 9) next.push({ command: "/roi", why: `${s.roi.measured} of 9 ROI inputs measured` });
    else next.push({ command: "/gate 3", why: "ROI inputs measured — assess the production gate" });
  } else {
    next.push({ command: "/harness-improver close", why: "the library contribution is the capstone bar; an engagement that compounds nothing is staffing" });
  }

  next.push({ command: "/chronicle", why: "at the end of every session — the log, the feedback, the memory" });
  return { where, next: next.slice(0, 5) };
}

export function formatCommands(cmds: readonly CommandInfo[], ctx?: { slug: string; where: string; next: Suggestion[] }): string {
  const out: string[] = [];
  const { groups, unplaced } = groupCommands(cmds);
  if (ctx) {
    out.push(`WHERE YOU ARE — ${ctx.slug}`);
    out.push(`  ${ctx.where}`);
    out.push("");
    out.push("NEXT, IN ORDER");
    for (const n of ctx.next) {
      out.push(`  ${n.command}`);
      out.push(`      why: ${n.why}`);
    }
    out.push("");
  }
  out.push("COMMANDS — in stage order. Type one in Claude Code; the description is the command file's own.");
  out.push("");
  const width = Math.max(...cmds.map((c) => c.name.length)) + 1;
  for (const g of groups) {
    out.push(g.group);
    for (const c of g.commands) {
      const body = c.description.replace(/^(Stages?\s[^.]+\.|Any[^.]+\.|Gates?\s[^.]+\.|The three conversations[^.]*\.)\s*/, "");
      const first = body.split(/(?<=\.)\s/)[0] ?? body;
      out.push(`  /${c.name.padEnd(width)} ${first}`);
    }
    out.push("");
  }
  if (unplaced.length) {
    out.push(`Not placed in the stage order (fix COMMAND_ORDER in packages/derive/src/commands.ts): ${unplaced.map((n) => `/${n}`).join(", ")}`);
    out.push("");
  }
  out.push("CLI verbs behind the commands: node packages/derive/src/cli.ts — intake · sweep · anchors · propose · pending · accept · reject · next · answer · sketch · mockup · contract-check · roi · scaffold");
  out.push("Full detail: README.md → \"Using it — step by step\", and the per-stage table under \"The ten stages\".");
  return out.join("\n");
}
