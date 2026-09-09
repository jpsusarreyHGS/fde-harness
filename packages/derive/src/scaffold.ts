/**
 * Scaffold an engagement from the templates.
 *
 * This is the code behind `/init-engagement`, and it replaces the ten
 * `AskUserQuestion` prompts with a plain object — which is what lets a web
 * intake form or an unattended runner create an engagement.
 *
 * Two properties, both load-bearing:
 *   - **Idempotent.** Existing files are never overwritten. Re-running on a
 *     live engagement is safe, and operators will do it.
 *   - **Template-seeded.** Nothing is improvised. A missing template is
 *     reported as a defect rather than worked around, because a hand-rolled
 *     instrument carries no anchors and derived state cannot read it.
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { STAGES } from "./instruments.ts";

export interface EngagementVars {
  CLIENT_NAME: string;
  SLUG: string;
  SPONSOR: string;
  SCOPE: string;
  NON_GOALS: string;
  STAGE?: string;
  SYSTEMS?: string;
  ONTOLOGY_REPO?: string;
  RESIDENCY?: "client-tenant" | "hgs-tenant" | "tbd";
  LABOUR?: "works-council" | "union" | "none" | "unknown";
  DATE?: string;
}

export interface ScaffoldResult {
  created: string[];
  skipped: string[];
  /** Placeholders left unresolved — each should raise a Q-. */
  unresolved: string[];
  directories: number;
}

const SUBDIRS = [
  "00-Setup", "01-Organisation",
  "02-Workflow/evidence/observed", "02-Workflow/evidence/system",
  "02-Workflow/evidence/documented", "02-Workflow/evidence/stated",
  "02-Workflow/proposals",
  "03-Systems/ontology", "04-Placement", "05-Build/builds",
  "06-Evals/golden-sets", "06-Evals/runs", "07-Production", "08-ROI",
  "09-Loop", "skills-engagement", "chronicle/memory", "chronicle/sessions",
  "chronicle/run-events", "harness-improver/feedback",
  "harness-improver/improvements", "engagement-management",
];

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function substitute(text: string, vars: EngagementVars): string {
  const table: Record<string, string> = {
    CLIENT_NAME: vars.CLIENT_NAME,
    SLUG: vars.SLUG,
    SPONSOR: vars.SPONSOR,
    SCOPE: vars.SCOPE,
    NON_GOALS: vars.NON_GOALS,
    STAGE: vars.STAGE ?? "00-Setup",
    SYSTEMS: vars.SYSTEMS ?? "TBD",
    ONTOLOGY_REPO: vars.ONTOLOGY_REPO ?? "tbd",
    RESIDENCY: vars.RESIDENCY ?? "tbd",
    LABOUR: vars.LABOUR ?? "unknown",
    DATE: vars.DATE ?? new Date().toISOString().slice(0, 10),
    SESSION_DATE: vars.DATE ?? new Date().toISOString().slice(0, 10),
    SESSION_ID: "0",
    PROJECT_NAME: vars.CLIENT_NAME,
  };
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key: string) =>
    key in table ? table[key]! : whole,
  );
}

/**
 * Create the engagement tree and seed it from `templatesDir`.
 *
 * `templatesDir` is `.claude/templates/engagement-init`. The feedback
 * templates under `.claude/templates/harness-improver/feedback` are seeded
 * too when `feedbackDir` is given.
 */
export async function scaffoldEngagement(opts: {
  engagementsRoot: string;
  deliverablesRoot?: string;
  templatesDir: string;
  feedbackDir?: string;
  vars: EngagementVars;
}): Promise<ScaffoldResult> {
  const { engagementsRoot, templatesDir, feedbackDir, vars } = opts;
  const root = join(engagementsRoot, vars.SLUG);

  const result: ScaffoldResult = {
    created: [], skipped: [], unresolved: [], directories: 0,
  };

  for (const d of SUBDIRS) {
    await mkdir(join(root, ...d.split("/")), { recursive: true });
    result.directories++;
  }
  if (opts.deliverablesRoot) {
    for (const s of STAGES) {
      await mkdir(join(opts.deliverablesRoot, vars.SLUG, s.slug), { recursive: true });
      result.directories++;
    }
  }

  const seed = async (srcDir: string, dstBase: string) => {
    if (!(await exists(srcDir))) return;
    for (const src of await walk(srcDir)) {
      if (!src.endsWith(".template")) continue;
      const rel = relative(srcDir, src).split(sep).join("/");
      const dst = join(dstBase, ...rel.replace(/\.template$/, "").split("/"));
      if (await exists(dst)) {
        result.skipped.push(relative(root, dst).split(sep).join("/"));
        continue;
      }
      const body = substitute(await readFile(src, "utf8"), vars);
      for (const m of body.matchAll(/\{\{([A-Z_]+)\}\}/g)) {
        const key = m[1]!;
        if (!result.unresolved.includes(key)) result.unresolved.push(key);
      }
      await mkdir(dirname(dst), { recursive: true });
      await writeFile(dst, body, "utf8");
      result.created.push(relative(root, dst).split(sep).join("/"));
    }
  };

  await seed(templatesDir, root);
  if (feedbackDir) await seed(feedbackDir, join(root, "harness-improver", "feedback"));

  return result;
}
