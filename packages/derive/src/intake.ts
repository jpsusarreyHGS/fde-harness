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
