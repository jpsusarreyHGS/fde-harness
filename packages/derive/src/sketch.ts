/**
 * The alignment sketch: "here is what we think we heard — is it right?"
 *
 * Before G1 nothing in `deliverables/` is allowed to exist, and that is
 * correct: the allocation grid, the architecture and the readout all rest on
 * a gate that discovery has not yet passed. But a compressed engagement — one
 * day of discovery, a client waiting — needs something to put in front of
 * people that is not a design and does not pretend to be one. In the first
 * field simulation all three trainees built that artefact by hand, outside
 * the harness, and one of them leaked names and internal constraints into it.
 *
 * So this renders exactly one thing: the accepted rows, as they stand, with
 * their evidence class on every line, under a banner that says PROVISIONAL
 * and cannot be argued off. A step with no accepted row does not appear. A
 * pending proposal is not read. **The sketch never invents** — an honest
 * sparse page is the product.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataRows, findTable, parseAnchoredTables, type ParsedTable } from "./anchors.ts";
import { idPattern } from "./ids.ts";
import { INSTRUMENTS } from "./instruments.ts";
import { deriveState } from "./state.ts";
import { nextConversations } from "./coach.ts";

export const SKETCH_DIR = "sketch";
export const PROVISIONAL = "PROVISIONAL — pre-G1 alignment sketch";

export interface SketchOptions {
  engagementDir: string;
  slug: string;
  /** Where `assets/hgs-brand-tokens.css` lives. Tokens are inlined when found. */
  harnessRoot?: string;
  /** Root of `deliverables/`. Defaults to the sibling of the engagements root. */
  deliverablesDir?: string;
  now?: Date;
}

export interface SketchResult {
  /** Path of the written file, relative to the deliverables root. */
  path: string;
  /** Absolute path. */
  absolutePath: string;
  date: string;
  counts: { steps: number; exceptions: number; deadEnds: number; questions: number; constraints: number };
}

const CLASSES = new Set(["observed", "system", "documented", "stated"]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function cell(r: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const v = r[n];
    if (v !== undefined) return v.trim();
  }
  return "";
}

function has(v: string): boolean {
  const s = v.trim();
  return s !== "" && s !== "—" && s !== "-" && s !== "n/a" && !/^tbd$/i.test(s);
}

/** Markdown emphasis out; the sketch sets its own type. */
function plain(s: string): string {
  return s.replace(/[*_`]/g, "").trim();
}

/** Source ids out of body text — a client page does not carry EV-014. */
function noIds(s: string): string {
  return s.replace(idPattern(), "").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
}

function badge(cls: string): string {
  const c = CLASSES.has(cls) ? cls : "unverified";
  return `<span class="badge ${c}">${c}</span>`;
}

/**
 * The evidence class behind a row, from the observation-log rows it cites.
 *
 * A step whose `Source` cites an observed row was watched. One citing only a
 * stated row was described. One citing nothing is unverified, and the page
 * says so — a sketch that hid that distinction would be the thing the
 * evidence classes exist to prevent.
 */
function classOf(source: string, classById: Map<string, string>): string {
  const classes = new Set<string>();
  for (const m of source.matchAll(idPattern())) {
    const c = classById.get(m[1]!);
    if (c) classes.add(c);
  }
  for (const c of ["observed", "system", "documented", "stated"]) if (classes.has(c)) return c;
  return "unverified";
}

async function readTables(engagementDir: string, id: string): Promise<ParsedTable[]> {
  const def = INSTRUMENTS.find((i) => i.id === id);
  if (!def) return [];
  try {
    return parseAnchoredTables(await readFile(join(engagementDir, ...def.path.split("/")), "utf8"));
  } catch {
    return [];
  }
}

function rows(tables: ParsedTable[], anchor: string): Record<string, string>[] {
  const t = findTable(tables, anchor);
  return t ? dataRows(t) : [];
}

export async function renderSketch(opts: SketchOptions): Promise<SketchResult> {
  const { engagementDir, slug } = opts;
  const now = opts.now ?? new Date();
  const date = now.toISOString().slice(0, 10);
  const deliverablesDir = opts.deliverablesDir ?? join(engagementDir, "..", "..", "deliverables");

  const [sponsor, map, obs, exceptions, readiness] = await Promise.all([
    readTables(engagementDir, "sponsor-brief"),
    readTables(engagementDir, "operating-map"),
    readTables(engagementDir, "observation-log"),
    readTables(engagementDir, "exception-register"),
    readTables(engagementDir, "readiness-scorecard"),
  ]);

  // Client name from the sponsor brief's title line, else the slug.
  let client = slug;
  try {
    const md = await readFile(join(engagementDir, "01-Organisation", "sponsor-brief.md"), "utf8");
    const m = /^#\s+Sponsor brief\s+—\s+(.+)$/m.exec(md);
    if (m && !/\{\{/.test(m[1]!)) client = m[1]!.trim();
  } catch { /* slug it is */ }

  const classById = new Map<string, string>();
  for (const r of rows(obs, "observation-log.rows")) {
    const id = cell(r, "Id");
    const c = cell(r, "Class").toLowerCase();
    if (has(id) && CLASSES.has(c)) classById.set(id, c);
  }

  // 1. What we heard
  const restatement = rows(sponsor, "sponsor-brief.restatement").find((r) => /real problem/i.test(cell(r, "Item")));
  const goal = rows(sponsor, "sponsor-brief.questions").find((r) => /trying to accomplish/i.test(cell(r, "Question")));
  const sentence = restatement && has(cell(restatement, "Value"))
    ? { text: cell(restatement, "Value"), label: "the problem, in the sponsor's words" }
    : goal && has(cell(goal, "Answer"))
      ? { text: cell(goal, "Answer"), label: "what the sponsor said they are trying to accomplish" }
      : null;
  const steps = rows(map, "operating-map.steps").map((r) => ({
    n: cell(r, "#"),
    step: noIds(plain(cell(r, "Step"))),
    actor: plain(cell(r, "Actor")),
    system: plain(cell(r, "System")),
    cls: classOf(cell(r, "Source"), classById),
  })).filter((s) => has(s.step));

  // 2. Where the work is lost
  const exs = rows(exceptions, "exception-register.rows").map((r) => ({
    trigger: noIds(plain(cell(r, "Trigger"))),
    frequency: plain(cell(r, "Frequency")),
    handling: noIds(plain(cell(r, "Current handling"))),
    holder: plain(cell(r, "Rule holder (role)")),
    cls: classOf(cell(r, "Source"), classById),
  })).filter((e) => has(e.trigger));
  const deadEnds = rows(map, "operating-map.dead-ends").map((r) => ({
    output: noIds(plain(cell(r, "Output"))),
    producedBy: plain(cell(r, "Produced by")),
    consumer: plain(cell(r, "Believed consumer")),
    confirmed: /^y/i.test(cell(r, "Confirmed?")),
    cls: classOf(cell(r, "Source"), classById),
  })).filter((d) => has(d.output));

  // 3. What we do not yet know — straight from the coach, grouped by who can answer.
  const state = await deriveState({ engagementDir, slug, harnessRoot: opts.harnessRoot, deliverablesDir });
  const groups = nextConversations(state.coach, 50)
    .map((g) => ({ who: g.who, questions: g.questions.filter((q) => q.source !== "gate" || q.work === "ask") }))
    .filter((g) => g.questions.length);
  const questionCount = groups.reduce((n, g) => n + g.questions.length, 0);

  // 4. Constraints already found
  const constraints = [
    ...rows(readiness, "readiness-scorecard.rows")
      .filter((r) => has(cell(r, "Blocker")))
      .map((r) => ({ what: `${plain(cell(r, "Source"))}: ${noIds(plain(cell(r, "Blocker")))}`, owner: plain(cell(r, "Blocker owner")), when: plain(cell(r, "Target date")) })),
    ...rows(readiness, "readiness-scorecard.blockers")
      .map((r) => ({ what: noIds(plain(cell(r, "Blocker"))), owner: plain(cell(r, "Owner")), when: plain(cell(r, "Mitigation")) })),
  ].filter((c) => has(c.what));

  // Brand tokens, inlined so the file stands alone on a client laptop.
  let tokens = "";
  if (opts.harnessRoot) {
    try { tokens = await readFile(join(opts.harnessRoot, "assets", "hgs-brand-tokens.css"), "utf8"); } catch { /* fall back to the defaults below */ }
  }

  const empty = (what: string) =>
    `<p class="empty">Nothing accepted yet for this section — ${what}. The sketch shows only rows the FDE has accepted; it does not fill gaps.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Alignment sketch — ${esc(client)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
${tokens || `:root{--hgs-impact-green:#ABCF02;--hgs-primary-blue:#00B0F0;--hgs-sage:#9AAC94;--hgs-system:#26476B;--hgs-foundation-grey:#5C6D72;--hgs-teal:#3D9B99;--hgs-core-charcoal:#2D2D2D;--hgs-blue-900:#001C41;--hgs-orange:#E67300;--hgs-red:#D12536;--hgs-font-body:'Kanit',system-ui,sans-serif}`}
:root{--ground:#F4F6F9;--surface:#fff;--line:#DFE5EC;--ink:var(--hgs-core-charcoal);--ink-2:var(--hgs-foundation-grey)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ground:#08131F;--surface:#0F1E30;--line:#22374F;--ink:#E6EDF3;--ink-2:#9FB0BF}}
:root[data-theme="dark"]{--ground:#08131F;--surface:#0F1E30;--line:#22374F;--ink:#E6EDF3;--ink-2:#9FB0BF}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--hgs-font-body,'Kanit',system-ui,sans-serif);font-weight:300;font-size:15.5px;line-height:1.6}
.banner{background:var(--hgs-orange);color:#fff;text-align:center;font-weight:500;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;padding:8px 16px}
.hd{background:var(--hgs-blue-900);color:#fff;padding:30px 0 26px}
.wrap{max-width:860px;margin:0 auto;padding:0 16px}
.hd .eyebrow{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--hgs-impact-green);font-weight:500}
.hd h1{font-size:28px;font-weight:600;margin:10px 0 0;line-height:1.2}
.hd p{margin:12px 0 0;color:rgba(255,255,255,.7);max-width:64ch}
main{padding:30px 0 50px}
section{background:var(--surface);border:1px solid var(--line);border-radius:5px;padding:24px 26px;margin-bottom:18px}
h2{font-size:19px;font-weight:600;margin:0 0 4px;color:var(--ink)}
.sub{color:var(--ink-2);font-size:13px;margin:0 0 14px}
ol,ul{margin:0;padding-left:22px}li{margin-bottom:8px}
.badge{display:inline-block;font-size:10.5px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:1px 7px;border-radius:3px;margin-left:8px;vertical-align:middle;color:#fff}
.badge.observed{background:var(--hgs-teal)}.badge.system{background:var(--hgs-system)}
.badge.documented{background:var(--hgs-foundation-grey)}.badge.stated{background:var(--hgs-sage)}
.badge.unverified,.badge.unquantified{background:var(--hgs-orange)}
blockquote{margin:0 0 14px;padding:12px 18px;border-left:3px solid var(--hgs-impact-green);color:var(--ink);font-size:17px;font-weight:400}
.meta{color:var(--ink-2);font-size:13px}
.empty{color:var(--ink-2);font-style:italic;margin:0}
.who{font-weight:500;margin:12px 0 4px}
.notthis{border-color:var(--hgs-orange)}
footer{background:var(--hgs-blue-900);color:rgba(255,255,255,.55);padding:18px 0;font-size:11.5px}
@media print{.banner{background:#fff;color:var(--hgs-orange);border-bottom:2px solid var(--hgs-orange)}}
</style>
</head>
<body>
<div class="banner">${PROVISIONAL}</div>
<header class="hd"><div class="wrap">
  <div class="eyebrow">${esc(client)} · discovery in progress</div>
  <h1>What we think we heard — is it right?</h1>
  <p>Everything on this page comes from notes, transcripts and observation accepted so far. Each line carries where it came from. It is a draft to be corrected, not a finding to be approved.</p>
</div></header>
<main><div class="wrap">

<section>
  <h2>What we heard</h2>
  <p class="sub">The problem as the sponsor put it, and the workflow as we have it so far. <em>observed</em> means we watched it; <em>stated</em> means someone told us; <em>unverified</em> means we have not yet traced it to either.</p>
  ${sentence ? `<blockquote>${esc(sentence.text)}</blockquote><p class="meta">${esc(sentence.label)} ${badge("stated")}</p>` : `<p class="empty">The sponsor's own sentence is not on file yet.</p>`}
  ${steps.length ? `<ol>${steps.map((s) => `<li><strong>${esc(s.step)}</strong>${s.actor || s.system ? ` <span class="meta">— ${esc([s.actor, s.system].filter(Boolean).join(" · "))}</span>` : ""}${badge(s.cls)}</li>`).join("")}</ol>` : empty("no operating-map steps")}
</section>

<section>
  <h2>Where the work is lost</h2>
  <p class="sub">Exceptions and dead ends we have seen or been told about. <em>unquantified</em> means nobody has counted it yet.</p>
  ${exs.length ? `<ul>${exs.map((e) => `<li><strong>${esc(e.trigger)}</strong>${e.handling ? ` <span class="meta">— today: ${esc(e.handling)}</span>` : ""} ${has(e.frequency) && !/unquantified/i.test(e.frequency) ? `<span class="meta">· ${esc(e.frequency)}</span>` : `<span class="badge unquantified">unquantified</span>`}${e.holder ? ` <span class="meta">· decided by the ${esc(e.holder.toLowerCase())}</span>` : ""}${badge(e.cls)}</li>`).join("")}</ul>` : empty("no exceptions")}
  ${deadEnds.length ? `<p class="who">Outputs nobody may be reading</p><ul>${deadEnds.map((d) => `<li><strong>${esc(d.output)}</strong>${d.producedBy ? ` <span class="meta">— produced by ${esc(d.producedBy)}</span>` : ""}${d.consumer ? ` <span class="meta">· believed consumer: ${esc(d.consumer)}${d.confirmed ? " (confirmed)" : " (not yet confirmed)"}</span>` : ""}${badge(d.cls)}</li>`).join("")}</ul>` : ""}
</section>

<section>
  <h2>What we do not yet know</h2>
  <p class="sub">Grouped by who can answer. These are the conversations we would like to have next.</p>
  ${groups.length ? groups.map((g) => `<p class="who">${esc(g.who)}</p><ul>${g.questions.map((q) => `<li>${esc(noIds(q.ask.replace(/^Q-\d+:\s*/, "")))}</li>`).join("")}</ul>`).join("") : `<p class="empty">No open questions on file.</p>`}
</section>

<section>
  <h2>Constraints we have already found</h2>
  <p class="sub">Access, data and policy limits that will shape anything built here.</p>
  ${constraints.length ? `<ul>${constraints.map((c) => `<li>${esc(c.what)}${c.owner ? ` <span class="meta">— owner: ${esc(c.owner)}</span>` : ""}${c.when ? ` <span class="meta">· ${esc(c.when)}</span>` : ""}</li>`).join("")}</ul>` : empty("no readiness blockers")}
</section>

<section class="notthis">
  <h2>What this is not</h2>
  <p>This is a sketch, not a design. It has passed no gate. Nothing on it has been prioritised, costed or committed to, and every panel above is provisional — written to be corrected by the people who do the work. Where a line says <em>stated</em> or <em>unverified</em>, we have not yet watched it happen, and we will not build on it until we have.</p>
</section>

</div></main>
<footer><div class="wrap">${PROVISIONAL} · ${esc(client)} · ${date} · HGS Forward Deployed Engineering</div></footer>
</body>
</html>
`;

  const outDir = join(deliverablesDir, slug, SKETCH_DIR);
  await mkdir(outDir, { recursive: true });
  const file = `${date}.html`;
  const absolutePath = join(outDir, file);
  await writeFile(absolutePath, html, "utf8");

  return {
    path: `${slug}/${SKETCH_DIR}/${file}`,
    absolutePath,
    date,
    counts: { steps: steps.length, exceptions: exs.length, deadEnds: deadEnds.length, questions: questionCount, constraints: constraints.length },
  };
}
