#!/usr/bin/env node
/**
 * Derive every engagement and render the dashboard.
 *
 *   node scripts/render-dashboard.mjs            every engagement
 *   node scripts/render-dashboard.mjs <slug>     one engagement
 *
 * Two phases, always in this order: derive `state.json` from the files, then
 * substitute into the template. Never render a stale state — a dashboard
 * built on yesterday's numbers is believed.
 *
 * Writes:
 *   engagements/<slug>/state.json         regenerated, every run
 *   engagements/<slug>/dashboard.html     single-engagement view
 *   dashboard.html                        portfolio, at the harness root
 *
 * Exit codes:
 *   0  rendered
 *   1  nothing to render (no engagement has a state to derive)
 *   2  bad invocation
 *   3  an engagement's files claim something untrue — refused, per the CLI
 */

import { readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveState } from "../packages/derive/src/state.ts";
import { tampered, validateState } from "../packages/derive/src/validate.ts";
import { readTemplate, renderDashboardHtml } from "../packages/derive/src/dashboard.ts";

const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const only = process.argv[2];

const root = join(HARNESS, "engagements");
let slugs;
try {
  slugs = (await readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
} catch {
  slugs = [];
}
if (only) {
  if (!slugs.includes(only)) {
    console.error(`no engagements/${only}. Run /init-engagement first.`);
    process.exit(2);
  }
  slugs = [only];
}
if (!slugs.length) {
  console.error("No engagements to render. Run /init-engagement, or load an example:");
  console.error("  node scripts/load-example.mjs northwind-insurance");
  process.exit(1);
}

const template = await readTemplate(HARNESS);
const states = [];
for (const slug of slugs) {
  const engagementDir = join(root, slug);
  // A directory with none of the instruments is not an engagement — a stray
  // folder someone made by hand. Say so rather than deriving an all-zero state
  // that then renders as if it were real.
  try { await stat(join(engagementDir, "00-Setup")); } catch {
    console.error(`skipping engagements/${slug} — no 00-Setup/; not scaffolded by /init-engagement`);
    continue;
  }
  const state = await deriveState({
    engagementDir, slug, harnessRoot: HARNESS,
    datasourcesDir: join(HARNESS, "datasources"),
    deliverablesDir: join(HARNESS, "deliverables"),
  });
  const violations = validateState(state);
  const fatal = tampered(violations);
  if (fatal.length) {
    for (const v of fatal) console.error(`TAMPERED  ${slug}  ${v.rule}  ${v.detail}`);
    console.error("Refusing to render. Fix the engagement files — state is derived, never authoritative.");
    process.exit(3);
  }
  for (const v of violations) console.error(`warn  ${slug}  ${v.rule}  ${v.detail}`);
  await writeFile(join(engagementDir, "state.json"), JSON.stringify(state, null, 2) + "\n", "utf8");
  await writeFile(join(engagementDir, "dashboard.html"), renderDashboardHtml(template, [state]), "utf8");
  states.push(state);
  console.log(`engagements/${slug}/dashboard.html`);
}
if (!states.length) process.exit(1);

await writeFile(join(HARNESS, "dashboard.html"), renderDashboardHtml(template, states), "utf8");
console.log(`dashboard.html  (${states.length} engagement${states.length === 1 ? "" : "s"})`);
console.log("");
console.log("Open by double-click. A red gate or an empty instrument is the harness working.");
