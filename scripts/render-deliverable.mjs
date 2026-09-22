#!/usr/bin/env node
/**
 * Render one engagement markdown file to a client-ready HTML deliverable.
 *
 *   node scripts/render-deliverable.mjs <slug> <in-engagement path> [flags]
 *
 *   --internal         skip the client-safe pass (the page is for us)
 *   --with-citations   leave EV-/EX-/Q-/REQ- ids in the body
 *   --keep-quotes      leave observed-evidence quotes in place (operator confirmed)
 *
 * The client-safe pass is **on by default**: Source lines and columns out,
 * harness ids out, named individuals replaced by their role unless the
 * allow-list approves them, observed quotes withheld. A redaction report is
 * printed and written beside the page as `<name>.redactions.md`. When the
 * pass removes nothing it says so — silence is never ambiguous.
 *
 * Writes deliverables/<slug>/<stage folder>/<basename>.html.
 *
 * Exit codes: 0 rendered · 1 source not found · 2 bad invocation
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { clientSafe, formatRedactionReport, loadNames, loadObserved } from "../packages/derive/src/clientsafe.ts";
import { parseAnchoredTables, findTable } from "../packages/derive/src/anchors.ts";

const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(HARNESS, ".claude", "skills", "skills-function", "render-deliverables", "template.html");

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [slug, target] = args.filter((a) => !a.startsWith("--"));
if (!slug || !target) {
  console.error("usage: node scripts/render-deliverable.mjs <slug> <in-engagement path> [--internal] [--with-citations] [--keep-quotes]");
  process.exit(2);
}

const engagementDir = join(HARNESS, "engagements", slug);
const rel = target.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/, "") + ".md";
const src = join(engagementDir, ...rel.split("/"));
let md;
try { md = await readFile(src, "utf8"); } catch {
  console.error(`engagements/${slug}/${rel} not found.`);
  process.exit(1);
}

// Client name: the overview's identity table, else the H1's suffix, else the slug.
let client = slug;
try {
  const ov = await readFile(join(engagementDir, "chronicle", "memory", "engagement-overview.md"), "utf8");
  const m = /^\|\s*Client\s*\|\s*(.+?)\s*\|$/m.exec(ov);
  if (m && !/\{\{/.test(m[1])) client = m[1];
} catch { /* fall through */ }
const h1 = /^#\s+(.+)$/m.exec(md)?.[1] ?? basename(rel, ".md");
if (client === slug) { const m = /—\s*(.+)$/.exec(h1); if (m) client = m[1].trim(); }
const title = h1.replace(/\s*—\s*.+$/, "").trim();
const stage = rel.split("/")[0];
const date = new Date().toISOString().slice(0, 10);

const outDir = join(HARNESS, "deliverables", slug, stage);
await mkdir(outDir, { recursive: true });
const name = basename(rel, ".md");
const outHtml = join(outDir, `${name}.html`);
const outReport = join(outDir, `${name}.redactions.md`);
const shownOut = `deliverables/${slug}/${stage}/${name}.html`;

let body = md;
let report;
if (flags.has("--internal")) {
  report = formatRedactionReport([], rel, shownOut, { skipped: "--internal" });
} else {
  const { roles, allow } = await loadNames(engagementDir);
  const observed = flags.has("--keep-quotes") ? [] : await loadObserved(engagementDir);
  const res = clientSafe(md, { roles, allow, observed, keepCitations: flags.has("--with-citations"), keepQuotes: flags.has("--keep-quotes") });
  body = res.text;
  report = formatRedactionReport(res.redactions, rel, shownOut);
}

const template = await readFile(TEMPLATE, "utf8");
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const html = template
  .replace(/\{\{TITLE\}\}/g, escAttr(title))
  .replace(/\{\{CLIENT\}\}/g, escAttr(client))
  .replace(/\{\{PHASE\}\}/g, escAttr(stage))
  .replace(/\{\{DATE\}\}/g, date)
  .replace("{{CONTENT}}", body.replace(/<\/script/gi, "<\\/script"));

await writeFile(outHtml, html, "utf8");
await writeFile(outReport, report, "utf8");

console.log(shownOut);
console.log("");
console.log(report.trim());
