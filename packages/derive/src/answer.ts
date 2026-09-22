/**
 * Answers given in conversation, written down before they evaporate.
 *
 * `/next` asks a question; the operator answers it in chat; nothing happens.
 * The principle — answers go into the instrument, not into chat — was right,
 * but the harness offered no path from one to the other except "create a
 * notes file by hand", and most people will not. So the same question came
 * back the next morning, and the trainee who had already answered it twice
 * stopped reading the queue.
 *
 * This writes the answer where the harness already looks: a dated file in
 * `02-Workflow/evidence/<class>/`, which `intake` lists and `/capture` reads.
 * Nothing reaches a register from here — that still takes a proposal and an
 * accept. What changes is that the answer exists.
 *
 * The class defaults to `stated` because that is what a chat answer is:
 * something a person said. It becomes primary evidence only by being watched.
 */

import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataRows, findTable, parseAnchoredTables } from "./anchors.ts";
import { EVIDENCE_ROOT } from "./intake.ts";
import { WriteRefused } from "./writer.ts";

export type AnswerClass = "stated" | "documented";

export interface RecordAnswerOptions {
  /** A `Q-` id from open-questions, or the question in words. */
  question: string;
  /** What was said, verbatim. */
  answer: string;
  /** Who said it — a role, or a name and role. Never blank. */
  from: string;
  evidenceClass?: AnswerClass;
  now?: Date;
}

export interface RecordAnswerResult {
  /** Path relative to the engagement root. */
  path: string;
  /** True when this call created the day's file. */
  created: boolean;
  /** The `Q-` id, when the question was one. */
  questionId: string | null;
  evidenceClass: AnswerClass;
}

function header(date: string, cls: AnswerClass): string {
  return [
    `# Answers recorded — ${date}`,
    "",
    "Each entry is what someone said in answer to a question, verbatim, with",
    `who said it. Evidence class: **${cls}**${cls === "stated" ? " — corroborating only. Anything proposed from this file is `UNVERIFIED` until it has been watched." : "."}`,
    "",
    "Run `/capture` to turn these into proposed rows. Nothing here has reached a",
    "register.",
    "",
  ].join("\n");
}

export async function recordAnswer(
  engagementDir: string,
  opts: RecordAnswerOptions,
): Promise<RecordAnswerResult> {
  const cls: AnswerClass = opts.evidenceClass ?? "stated";
  const question = opts.question.trim();
  const answer = opts.answer.trim();
  const from = opts.from.trim();
  if (!question) throw new WriteRefused("an answer needs the question it answers");
  if (!answer) throw new WriteRefused("nothing to record — the answer is empty");
  if (!from) {
    throw new WriteRefused(
      "an answer needs --from: who said it. A quote with no speaker is an unattributed claim, which is the thing the evidence classes exist to prevent.",
    );
  }

  // A `Q-` id is looked up so the entry carries the question's words, and so
  // an id that does not exist is refused rather than cited into a file.
  let questionId: string | null = null;
  let questionText = question;
  const idMatch = /^(Q-\d+)$/i.exec(question);
  if (idMatch) {
    questionId = idMatch[1]!.toUpperCase();
    let md: string;
    try {
      md = await readFile(join(engagementDir, "02-Workflow", "open-questions.md"), "utf8");
    } catch {
      throw new WriteRefused("02-Workflow/open-questions.md is missing — run /init-engagement");
    }
    const t = findTable(parseAnchoredTables(md), "open-questions.rows");
    const row = t ? dataRows(t).find((r) => (r["Id"] ?? "").trim().toUpperCase() === questionId) : undefined;
    if (!row) {
      throw new WriteRefused(
        `${questionId} is not in open-questions.md. Give the question in words instead, or check the id.`,
      );
    }
    questionText = (row["Question"] ?? "").trim() || questionId;
  }

  const now = opts.now ?? new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 16);
  const dir = join(engagementDir, ...EVIDENCE_ROOT.split("/"), cls);
  await mkdir(dir, { recursive: true });
  const file = `${date}-answers.md`;
  const abs = join(dir, file);

  let created = false;
  try {
    await stat(abs);
  } catch {
    await writeFile(abs, header(date, cls), "utf8");
    created = true;
  }

  const entry = [
    "",
    `## ${time} — ${questionId ?? questionText}`,
    "",
    ...(questionId ? [`**Asked:** ${questionText}`, ""] : []),
    `**Answered by:** ${from}`,
    "",
    "**Answer, verbatim:**",
    "",
    ...answer.split(/\r?\n/).map((l) => `> ${l}`),
    "",
  ].join("\n");
  await appendFile(abs, entry, "utf8");

  return {
    path: `${EVIDENCE_ROOT}/${cls}/${file}`,
    created,
    questionId,
    evidenceClass: cls,
  };
}
