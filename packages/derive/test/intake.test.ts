/**
 * Phase 4: the burden collapse.
 *
 * The measured baseline was ~700–1,000 cells typed for a two-hour, 40-action
 * shadowing session, of which 100–150 were id tokens and citations. These
 * tests hold the new path to a much lower number, and — more importantly —
 * prove that the things a human used to have to get right by hand are now
 * structurally impossible to get wrong: ids collide, classes drift, citations
 * dangle.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { mintIds, scanIds, knownIds } from "../src/ids.ts";
import { appendRows, retireRow, WriteRefused } from "../src/writer.ts";
import { scanIntake, transcriptToText, handlingFor, intakeBrief } from "../src/intake.ts";
import { writeProposal, acceptProposal, pendingProposals } from "../src/proposals.ts";
import { deriveState } from "../src/state.ts";

const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");

let tmp: string;
let dir: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-intake-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Intake Co", SLUG: "intake-co", SPONSOR: "Director, Ops",
      SCOPE: "Correspondence triage", NON_GOALS: "No adjudication.",
      RESIDENCY: "client-tenant", LABOUR: "none", DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "intake-co");
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

// ------------------------------------------------------------------- ids

test("ids are minted by code, contiguous, from max+1", async () => {
  const first = await mintIds(dir, "EV", 3);
  assert.deepEqual(first.ids, ["EV-001", "EV-002", "EV-003"]);
  assert.equal(first.previousMax, 0);
});

test("minting reads max(seen)+1, not count+1", async () => {
  // The rule that makes this non-trivial: ids are append-only and never
  // reused, so a register with a gap must not refill it.
  const md = "| EV-001 | | |\n| EV-007 | | |\n";
  assert.deepEqual(scanIds(md, "EV"), [1, 7]);
});

test("a struck-through id is still consumed", async () => {
  // "A deleted row is struck through with a reason, not removed." Missing it
  // would let the next mint reuse a retired id, and the citations pointing at
  // the retired row would silently resolve to a different fact.
  const md = "| ~~EV-014~~ | withdrawn — duplicate of EV-009 |\n";
  // Both are seen: the retired id so it is never reissued, and the id in the
  // reason so a mint never lands on that one either.
  assert.deepEqual(scanIds(md, "EV").sort((a, b) => a - b), [9, 14]);
});

// ---------------------------------------------------------------- writer

test("a row can be appended by code, and derives immediately", async () => {
  const res = await appendRows(dir, "02-Workflow/observation-log.md", "observation-log.rows", [
    { Id: "EV-001", Time: "09:02:11", "Actor (role)": "Analyst",
      Action: "opened correspondence", System: "Mailbox", Secs: "14",
      Tell: "switch", Class: "observed" },
  ]);
  assert.equal(res.written, 1);

  const state = await deriveState({ engagementDir: dir, slug: "intake-co" });
  assert.equal(state.chain.evidence.total, 1);
  assert.equal(state.chain.evidence.observed, 1);
});

test("a column that does not exist is refused, not silently dropped", async () => {
  await assert.rejects(
    () => appendRows(dir, "02-Workflow/observation-log.md", "observation-log.rows", [
      { Id: "EV-999", Actorr: "typo" },
    ]),
    (e: Error) => e instanceof WriteRefused && /not a column/.test(e.message),
  );
});

test("writing to a labels table is refused — its rows are schema", async () => {
  await assert.rejects(
    () => appendRows(dir, "01-Organisation/stakeholder-map.md", "stakeholder-map.five-roles", [
      { Role: "Invented role" },
    ]),
    (e: Error) => e instanceof WriteRefused && /role=labels/.test(e.message),
  );
});

test("a pipe in content survives the round trip", async () => {
  await appendRows(dir, "02-Workflow/exception-register.md", "exception-register.rows", [
    { Id: "EX-001", Trigger: "vendor A | vendor B mismatch", Frequency: "3 per week",
      "Rule holder (role)": "Claims supervisor", Source: "EV-001" },
  ]);
  const state = await deriveState({ engagementDir: dir, slug: "intake-co" });
  assert.equal(state.chain.exceptions.total, 1);
  assert.equal(state.chain.exceptions.withRuleHolder, 1);
});

test("retiring a row strikes it through and keeps the id spent", async () => {
  const ok = await retireRow(dir, "02-Workflow/observation-log.md",
    "observation-log.rows", "EV-001", "duplicate capture");
  assert.equal(ok, true);
  const md = await readFile(join(dir, "02-Workflow", "observation-log.md"), "utf8");
  assert.match(md, /~~EV-001~~/);
  assert.match(md, /retired: duplicate capture/);

  const next = await mintIds(dir, "EV", 1);
  assert.equal(next.ids[0], "EV-002", "a retired id is never reissued");
});

// ---------------------------------------------------------------- intake

test("evidence class comes from the folder, never from content", async () => {
  const root = join(dir, "02-Workflow", "evidence");
  for (const c of ["observed", "stated", "documented", "system"]) {
    await mkdir(join(root, c), { recursive: true });
  }
  await writeFile(join(root, "observed", "shift-notes.txt"), "watched the analyst", "utf8");
  await writeFile(join(root, "stated", "kickoff.vtt"), "WEBVTT\n\n1\n00:01 --> 00:02\nthey said", "utf8");
  await writeFile(join(root, "documented", "routing-sop.pdf"), "%PDF-1.4", "utf8");
  await writeFile(join(root, "loose-note.txt"), "dropped in the wrong place", "utf8");

  const { items, unclassified } = await scanIntake(dir);
  const byClass = Object.fromEntries(items.map((i) => [i.file, i.evidenceClass]));

  assert.equal(byClass["shift-notes.txt"], "observed");
  assert.equal(byClass["kickoff.vtt"], "stated");
  assert.equal(byClass["routing-sop.pdf"], "documented");
  assert.deepEqual(unclassified, ["02-Workflow/evidence/loose-note.txt"],
    "a file outside a class folder is reported, never guessed");
});

test("the brief tells an agent what standing the material has", async () => {
  const { items } = await scanIntake(dir);
  const stated = items.find((i) => i.evidenceClass === "stated")!;
  assert.match(intakeBrief(stated), /UNVERIFIED/);
  const documented = items.find((i) => i.evidenceClass === "documented")!;
  assert.match(intakeBrief(documented), /finding, not a discrepancy/);
});

test("handling is known per format, and unsupported says so", () => {
  assert.equal(handlingFor("notes.txt"), "text");
  assert.equal(handlingFor("call.vtt"), "text");
  assert.equal(handlingFor("sop.pdf"), "convert");
  assert.equal(handlingFor("voice.m4a"), "needs-service");
  assert.equal(handlingFor("whiteboard.jpg"), "needs-service");
  assert.equal(handlingFor("weird.xyz"), "unsupported");
});

test("a transcript is stripped to speech", () => {
  const vtt = [
    "WEBVTT", "", "1", "00:00:01.000 --> 00:00:04.000",
    "<v Analyst>we always retype the reference", "",
    "2", "00:00:04.000 --> 00:00:07.000",
    "because the systems do not talk",
  ].join("\n");
  assert.equal(transcriptToText(vtt), "we always retype the reference\nbecause the systems do not talk");
});

// ------------------------------------------------------------- proposals

test("a proposal writes nothing until it is accepted", async () => {
  const before = await deriveState({ engagementDir: dir, slug: "intake-co" });

  const name = await writeProposal({
    engagementDir: dir,
    source: "shift-notes.txt",
    agent: "discovery-analyst",
    blocks: [{
      instrument: "02-Workflow/observation-log.md",
      anchor: "observation-log.rows",
      prefix: "EV",
      idColumn: "Id",
      columns: ["Id", "Time", "Actor (role)", "Action", "System", "Secs", "Tell", "Class"],
      rows: [
        { Time: "10:00:00", "Actor (role)": "Analyst", Action: "opened queue", System: "Mailbox", Secs: "9", Tell: "switch", Class: "observed" },
        { Time: "10:01:00", "Actor (role)": "Analyst", Action: "retyped ref", System: "Core", Secs: "31", Tell: "paste", Class: "observed" },
      ],
    }],
  });

  const after = await deriveState({ engagementDir: dir, slug: "intake-co" });
  assert.equal(after.chain.evidence.total, before.chain.evidence.total,
    "proposing must not write");
  assert.deepEqual(await pendingProposals(dir), [name]);
});

test("accepting mints ids and appends the rows", async () => {
  const [name] = await pendingProposals(dir);
  assert.ok(name);
  const res = await acceptProposal(dir, name);
  assert.deepEqual(res.danglingCitations, []);
  assert.equal(res.totalRows, 2);
  assert.deepEqual(res.written[0]!.ids, ["EV-002", "EV-003"],
    "ids continue the sequence past the retired EV-001");

  const state = await deriveState({ engagementDir: dir, slug: "intake-co" });
  assert.equal(state.chain.evidence.total, 2, "the retired row no longer counts");
  assert.deepEqual(await pendingProposals(dir), [], "accepted proposals leave the queue");
});

test("accepting twice is refused — it would duplicate every row", async () => {
  const dirents = await import("node:fs/promises").then((m) => m.readdir(join(dir, "02-Workflow", "proposals")));
  const name = dirents.find((f) => f.endsWith(".md"))!;
  await assert.rejects(
    () => acceptProposal(dir, name),
    (e: Error) => e instanceof WriteRefused && /already accepted/.test(e.message),
  );
});

test("a proposal citing an id that does not exist is refused whole", async () => {
  // Catching an invented citation at accept time is the point: the audit
  // would find it three days later, by which time it has been built on.
  const name = await writeProposal({
    engagementDir: dir,
    source: "brain-dump.txt",
    agent: "discovery-analyst",
    blocks: [{
      instrument: "02-Workflow/requirements-register.md",
      anchor: "requirements-register.rows",
      prefix: "REQ",
      idColumn: "Id",
      columns: ["Id", "Requirement", "Source", "Class", "Confidence"],
      rows: [
        { Requirement: "Route post-close to recon", Source: "EX-001", Class: "functional", Confidence: "verified" },
        { Requirement: "Suppress duplicates", Source: "EV-099", Class: "functional", Confidence: "verified" },
      ],
    }],
  });

  const res = await acceptProposal(dir, name);
  assert.equal(res.totalRows, 0, "nothing is written when any citation dangles");
  assert.equal(res.danglingCitations.length, 1);
  assert.equal(res.danglingCitations[0]!.cited, "EV-099");

  const state = await deriveState({ engagementDir: dir, slug: "intake-co" });
  assert.equal(state.chain.requirements.total, 0, "a partial accept never happens");
});

// ---------------------------------------------------------- the burden

test("BURDEN: a 40-action session costs the FDE no id or citation typing", async () => {
  // The whole point of the phase. Forty observation rows previously meant
  // 400 typed cells including 40 hand-sequenced ids; the citations they feed
  // meant another 100-150 id tokens. Here the human supplies content only.
  const rows = Array.from({ length: 40 }, (_, i) => ({
    Time: `1${String(Math.floor(i / 6)).padStart(1, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00`,
    "Actor (role)": "Analyst",
    Action: `step ${i + 1}`,
    System: i % 3 === 0 ? "Mailbox" : "Core",
    Secs: String(10 + i),
    Tell: (["switch", "paste", "dead", "repeat"] as const)[i % 4]!,
    Class: "observed",
  }));

  const name = await writeProposal({
    engagementDir: dir,
    source: "session-2.txt",
    agent: "discovery-analyst",
    blocks: [{
      instrument: "02-Workflow/observation-log.md",
      anchor: "observation-log.rows",
      prefix: "EV",
      idColumn: "Id",
      columns: ["Id", "Time", "Actor (role)", "Action", "System", "Secs", "Tell", "Class"],
      rows,
    }],
  });

  // Not one id appears in the proposal the human reads.
  const proposal = await readFile(join(dir, "02-Workflow", "proposals", name), "utf8");
  const idTokens = (proposal.match(/\bEV-\d+\b/g) ?? []).length;
  assert.equal(idTokens, 0, "the human never sees, types or sequences an id");

  const res = await acceptProposal(dir, name);
  assert.equal(res.totalRows, 40);

  const ids = res.written[0]!.ids;
  assert.equal(ids.length, 40);
  assert.equal(ids[0], "EV-004", "continues past everything already spent");
  assert.equal(ids.at(-1), "EV-043");
  // contiguous, no gaps, no reuse
  const nums = ids.map((x) => Number(x.slice(3)));
  assert.deepEqual(nums, nums.map((_, i) => nums[0]! + i));

  const state = await deriveState({ engagementDir: dir, slug: "intake-co" });
  assert.equal(state.chain.evidence.total, 42);
  assert.equal(state.chain.audit.danglingCitations, 0, "code-minted ids cannot dangle");
});
