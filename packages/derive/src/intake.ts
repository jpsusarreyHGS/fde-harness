/**
 * Intake: raw material in, classified evidence out.
 *
 * The single highest-value automation in the harness, and it is barely code.
 *
 * Evidence class — observed / system / documented / stated — is the thing the
 * whole judgment chain rests on. A requirement sourced only from Stated
 * evidence must be labelled `UNVERIFIED`, and the gap between what an SOP says
 * and what an operator does is frequently where the entire opportunity lives.
 * Until now that discipline depended on an FDE remembering to type the right
 * word into a column at the end of a long day.
 *
 * So make it structural: the class comes from **where the material was
 * dropped**, not from anyone's memory.
 *
 *   02-Workflow/evidence/observed/    an FDE watched it
 *   02-Workflow/evidence/system/      a log, export or system record
 *   02-Workflow/evidence/documented/  an SOP, policy, spec or deck
 *   02-Workflow/evidence/stated/      an interview, call or transcript
 *
 * Note the ordering that follows for free: a meeting transcript dropped into
 * `stated/` can never silently become primary evidence, however confidently
 * it reads.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import type { Dirent, Stats } from "node:fs";
import { extname, join } from "node:path";

export type EvidenceClass = "observed" | "system" | "documented" | "stated";

export const EVIDENCE_CLASSES: readonly EvidenceClass[] = [
  "observed",
  "system",
  "documented",
  "stated",
] as const;

export const EVIDENCE_ROOT = "02-Workflow/evidence";

/** What each folder means, for the prompt an agent is handed. */
export const CLASS_MEANING: Record<EvidenceClass, string> = {
  observed:
    "An FDE watched this happen. Primary evidence — can source a requirement on its own.",
  system:
    "A log, export, record or config. Primary for volume and frequency; silent on intent.",
  documented:
    "A policy, SOP, runbook or spec. Aspirational until observed — records what should happen.",
  stated:
    "An interview, meeting, call or transcript. Corroborating only — records what someone believes happens.",
};

/**
 * Formats intake understands.
 *
 * `convert` means `scripts/convert_to_md.py` handles it; `text` means read it
 * directly; `needs-service` means it must be transcribed or described before
 * the harness can do anything with it, and saying so plainly beats pretending.
 */
export type Handling = "text" | "convert" | "needs-service";

const HANDLING: Record<string, Handling> = {
  ".md": "text", ".txt": "text", ".csv": "text", ".tsv": "text",
  ".json": "text", ".jsonl": "text", ".log": "text",
  ".vtt": "text", ".srt": "text", ".eml": "text",
  ".pdf": "convert", ".docx": "convert", ".pptx": "convert",
  ".xlsx": "convert", ".xlsm": "convert", ".xls": "convert",
  ".m4a": "needs-service", ".mp3": "needs-service", ".wav": "needs-service",
  ".ogg": "needs-service", ".mp4": "needs-service", ".mov": "needs-service",
  ".png": "needs-service", ".jpg": "needs-service", ".jpeg": "needs-service",
  ".heic": "needs-service", ".webp": "needs-service", ".gif": "needs-service",
};

export function handlingFor(file: string): Handling | "unsupported" {
  return HANDLING[extname(file).toLowerCase()] ?? "unsupported";
}

export interface IntakeItem {
  /** Path relative to the engagement root. */
  path: string;
  file: string;
  /** Set by the folder it was dropped in. Never inferred from content. */
  evidenceClass: EvidenceClass;
  handling: Handling | "unsupported";
  sizeBytes: number;
  modified: string;
  /** True once a sibling `.md` conversion exists. */
  converted: boolean;
}

/**
 * Everything sitting in the evidence tree, with its class already decided.
 *
 * Files dropped directly into `evidence/` rather than a class folder are
 * returned as `unclassified` so the caller can ask which they are, rather
 * than guessing — guessing the class is the one thing this design exists to
 * prevent.
 */
export async function scanIntake(engagementDir: string): Promise<{
  items: IntakeItem[];
  unclassified: string[];
}> {
  const root = join(engagementDir, ...EVIDENCE_ROOT.split("/"));
  const items: IntakeItem[] = [];
  const unclassified: string[] = [];

  let top: Dirent[];
  try {
    top = (await readdir(root, { withFileTypes: true })) as Dirent[];
  } catch {
    return { items, unclassified };
  }

  for (const e of top) {
    if (e.name.startsWith(".")) continue;
    if (e.isFile()) {
      // The folder's own README explains the four classes; it is not material.
      if (/^readme\.md$/i.test(e.name)) continue;
      unclassified.push(`${EVIDENCE_ROOT}/${e.name}`);
      continue;
    }
    if (!EVIDENCE_CLASSES.includes(e.name as EvidenceClass)) continue;

    const cls = e.name as EvidenceClass;
    const dir = join(root, e.name);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    const present = new Set(files);
    for (const f of files) {
      if (f.startsWith(".")) continue;
      // a conversion output is not itself an intake item
      if (f.endsWith(".md") && present.has(f.replace(/\.md$/, ""))) continue;
      let s: Stats;
      try {
        s = await stat(join(dir, f));
      } catch {
        continue;
      }
      if (!s.isFile()) continue;
      items.push({
        path: `${EVIDENCE_ROOT}/${cls}/${f}`,
        file: f,
        evidenceClass: cls,
        handling: handlingFor(f),
        sizeBytes: s.size,
        modified: s.mtime.toISOString().slice(0, 10),
        converted: present.has(`${f}.md`) || present.has(f.replace(/\.[^.]+$/, ".md")),
      });
    }
  }

  items.sort((a, b) => a.path.localeCompare(b.path));
  return { items, unclassified };
}

export interface PlacementWarning {
  /** Path relative to the engagement root. */
  path: string;
  /** What it looks like, where it belongs, and what leaving it costs. */
  message: string;
}

/**
 * Files that look misfiled — a warning, never a reclassification.
 *
 * In the first field simulation a trainee put his interview notes in
 * `observed/`, and the folder rule would have treated every requirement from
 * them as primary evidence. The rule stays: the folder decides. But the
 * obvious mismatches are cheap to spot, so intake says so at drop time, in
 * words that explain the cost, and then does exactly nothing about it.
 *
 * Three heuristics, deliberately narrow so the warning stays credible:
 * a transcript or email format, or interview language in the first forty
 * lines, sitting in `observed/`; a spreadsheet or export sitting in
 * `stated/`; a policy, SOP or procedure by name outside `documented/`.
 */
export async function placementWarnings(
  engagementDir: string,
  items: readonly IntakeItem[],
): Promise<PlacementWarning[]> {
  const out: PlacementWarning[] = [];
  const root = join(engagementDir, ...EVIDENCE_ROOT.split("/"));
  for (const i of items) {
    const ext = extname(i.file).toLowerCase();
    const name = i.file.toLowerCase();

    if (i.evidenceClass === "observed") {
      let why: string | null = null;
      if ([".vtt", ".srt", ".eml"].includes(ext)) {
        why = `is a ${ext === ".eml" ? "n email" : " transcript"}`.replace(/^is a n/, "is an").replace(/^is a  /, "is a ");
      } else if (i.handling === "text") {
        try {
          const head = (await readFile(join(root, i.evidenceClass, i.file), "utf8"))
            .split(/\r?\n/).slice(0, 40).join("\n");
          const m = /\b(interview|transcript|said|call with|on the call|meeting notes)\b/i.exec(head);
          if (m) why = `looks like an interview ("${m[1]}" in its first lines)`;
        } catch { /* unreadable — nothing to say */ }
      }
      if (why) {
        out.push({
          path: i.path,
          message:
            `${i.path} ${why} — observed/ is for what an FDE watched happen. ` +
            "If a person told you this, it belongs in stated/. Leaving it here treats it as primary evidence.",
        });
      }
    }

    if (i.evidenceClass === "stated" && [".csv", ".tsv", ".xlsx", ".xlsm", ".xls", ".json", ".jsonl", ".log"].includes(ext)) {
      out.push({
        path: i.path,
        message:
          `${i.path} is an export or a log — stated/ is for what a person told you. ` +
          "A machine produced this; it belongs in system/. Leaving it here understates it: system evidence is primary for volume and frequency.",
      });
    }

    if (i.evidenceClass !== "documented" && /\b(policy|policies|sop|sops|procedure|procedures|standard|guideline|guidelines)\b/i.test(name.replace(/[-_.]/g, " "))) {
      out.push({
        path: i.path,
        message:
          `${i.path} is named like a policy or SOP — documented/ is for written rules and specs. ` +
          `In ${i.evidenceClass}/ it will be read as ${i.evidenceClass === "observed" ? "something you watched" : i.evidenceClass === "system" ? "a system record" : "something someone said"}, ` +
          "and the documented-versus-observed gap — usually where the opportunity is — becomes invisible.",
      });
    }
  }
  return out;
}

/** Readable text for an item, or null when it needs a service first. */
export async function readIntake(
  engagementDir: string,
  item: IntakeItem,
): Promise<string | null> {
  const dir = join(engagementDir, ...EVIDENCE_ROOT.split("/"), item.evidenceClass);
  if (item.handling === "text") {
    return readFile(join(dir, item.file), "utf8");
  }
  // A conversion is written beside the source by the convert step.
  for (const candidate of [`${item.file}.md`, item.file.replace(/\.[^.]+$/, ".md")]) {
    try {
      return await readFile(join(dir, candidate), "utf8");
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/**
 * Strip a WebVTT or SRT transcript to plain speech.
 *
 * Timecodes and cue numbers are noise to an extraction pass and they are a
 * surprising share of the tokens — a one-hour transcript is roughly half
 * timing metadata.
 */
export function transcriptToText(raw: string): string {
  const out: string[] = [];
  let last = "";
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    if (s === "WEBVTT" || s.startsWith("NOTE ")) continue;
    if (/^\d+$/.test(s)) continue;
    if (/-->/.test(s)) continue;
    const clean = s.replace(/<[^>]+>/g, "").trim();
    if (!clean || clean === last) continue;
    last = clean;
    out.push(clean);
  }
  return out.join("\n");
}

/** A short brief describing what an agent is about to read, and its standing. */
export function intakeBrief(item: IntakeItem): string {
  return [
    `Source: ${item.path}`,
    `Evidence class: ${item.evidenceClass} — ${CLASS_MEANING[item.evidenceClass]}`,
    item.evidenceClass === "stated"
      ? "Anything sourced only from this must be labelled UNVERIFIED."
      : "",
    item.evidenceClass === "documented"
      ? "This records what should happen. Where it contradicts an observation, that is a finding, not a discrepancy to resolve."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
