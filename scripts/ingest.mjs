#!/usr/bin/env node
/**
 * Push derived engagement state to the console.
 *
 *   node scripts/ingest.mjs --base-url https://<app>.vercel.app [--slug demo-co] [--dry-run]
 *
 * The console has two backends: Postgres when `DATABASE_URL` is set, the
 * filesystem otherwise. **The filesystem backend cannot work on Vercel** —
 * there is no harness checkout on a serverless function's disk — so a deployed
 * console reads Postgres, and this is what puts anything in it.
 *
 * State is derived here, fresh, from the markdown. It is never read from a
 * `state.json` sitting on disk: that file may be hours old, and a console
 * showing yesterday's numbers with today's timestamp is worse than an empty
 * one, because it is believed.
 *
 * Zero dependencies and Node-native, matching the rest of the tooling. Needs
 * Node 24 for the TypeScript import.
 *
 * Environment:
 *   INGEST_SECRET  required — sent as `x-ingest-key`, compared in constant time
 *
 * Exit codes:
 *   0  every engagement stored
 *   1  at least one failed
 *   2  bad invocation
 */

import { readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveState } from "../packages/derive/src/state.ts";
import { tampered, validateState } from "../packages/derive/src/validate.ts";

const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const baseUrl = arg("base-url") ?? process.env.CONSOLE_URL;
const only = arg("slug");
const dryRun = process.argv.includes("--dry-run");

if (!baseUrl) {
  console.error("usage: node scripts/ingest.mjs --base-url <url> [--slug <slug>] [--dry-run]");
  console.error("");
  console.error("  --base-url  the console's origin, e.g. https://fde.vercel.app");
  console.error("  --slug      just this engagement (default: all of them)");
  console.error("  --dry-run   derive and validate, send nothing");
  console.error("");
  console.error("INGEST_SECRET must be set unless --dry-run.");
  process.exit(2);
}

const secret = process.env.INGEST_SECRET;
if (!secret && !dryRun) {
  console.error("INGEST_SECRET is not set. The route returns 503 without it on the server side");
  console.error("and 401 without it here, so this would fail either way.");
  process.exit(2);
}

const engagementsRoot = join(HARNESS, "engagements");
let slugs;
try {
  slugs = (await readdir(engagementsRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
} catch {
  console.error(`No engagements/ directory at ${engagementsRoot}.`);
  process.exit(2);
}

if (only) {
  if (!slugs.includes(only)) {
    console.error(`No engagement ${only}. Found: ${slugs.join(", ") || "none"}`);
    process.exit(2);
  }
  slugs = [only];
}

if (!slugs.length) {
  console.log("No engagements to ingest.");
  process.exit(0);
}

const endpoint = new URL("/api/ingest", baseUrl).toString();
let failed = 0;

for (const slug of slugs) {
  const engagementDir = join(engagementsRoot, slug);
  if (!(await stat(join(engagementDir, "00-Setup")).catch(() => null))) {
    console.error(`${slug}: not an engagement (no 00-Setup) — skipped`);
    continue;
  }

  let state;
  try {
    state = await deriveState({
      engagementDir,
      slug,
      harnessRoot: HARNESS,
      datasourcesDir: join(HARNESS, "datasources"),
      deliverablesDir: join(HARNESS, "deliverables"),
    });
  } catch (err) {
    console.error(`${slug}: derive failed — ${err.message}`);
    failed++;
    continue;
  }

  // Same refusal the CLI makes. Publishing a state that claims a gate passed
  // with nobody's name on it would put the untrue claim somewhere harder to
  // notice and harder to correct than the file it came from.
  const fatal = tampered(validateState(state));
  if (fatal.length) {
    for (const v of fatal) console.error(`${slug}: TAMPERED ${v.rule} — ${v.detail}`);
    console.error(`${slug}: refusing to publish. Fix the engagement files.`);
    failed++;
    continue;
  }

  const summary =
    `${state.chain.evidence.total} evidence · ` +
    `${state.chain.requirements.total} requirements · ` +
    `${state.chain.audit.findings.length} findings · ` +
    `${state.coach?.length ?? 0} queued questions`;

  if (dryRun) {
    console.log(`${slug}: would send — ${summary}`);
    continue;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-key": secret },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`${slug}: ${res.status} ${res.statusText} ${detail.slice(0, 200)}`);
      failed++;
      continue;
    }
    const out = await res.json().catch(() => ({}));
    console.log(`${slug}: ${out.stored ?? "stored"} — ${summary}`);
  } catch (err) {
    console.error(`${slug}: request failed — ${err.message}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} engagement(s) failed.`);
  process.exit(1);
}
console.log(`\n${slugs.length} engagement(s) ${dryRun ? "checked" : "ingested"}.`);
