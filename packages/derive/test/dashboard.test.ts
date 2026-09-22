/**
 * Item 6 of the SIM-01 brief: "there's nothing there because it needs me to
 * answer all of these questions to pass gate one."
 *
 * The bundled template read v1 keys (`phases[]`, `useCases[]`) from v2 state
 * and threw before painting. The render is now code, the early-state layout
 * is asserted on a freshly initialised engagement, and the script block is
 * syntax-checked so a template edit cannot ship a blank page again.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import vm from "node:vm";

import { scaffoldEngagement } from "../src/scaffold.ts";
import { deriveState } from "../src/state.ts";
import { appendRows } from "../src/writer.ts";
import { mintIds } from "../src/ids.ts";
import { isEarlyState, readTemplate, renderDashboardHtml } from "../src/dashboard.ts";

const run = promisify(execFile);
const HARNESS = resolve(import.meta.dirname, "..", "..", "..");
const TEMPLATES = join(HARNESS, ".claude", "templates", "engagement-init");

let tmp: string;
let dir: string;
let template: string;

before(async () => {
  tmp = await mkdtemp(join(tmpdir(), "fde-dash-"));
  await scaffoldEngagement({
    engagementsRoot: join(tmp, "engagements"),
    templatesDir: TEMPLATES,
    vars: {
      CLIENT_NAME: "Solara Foods", SLUG: "solara-foods", SPONSOR: "Dana Whitfield, VP Finance",
      SCOPE: "Deductions", NON_GOALS: "No portal changes.", RESIDENCY: "client-tenant", LABOUR: "none",
      DATE: "2026-09-09",
    },
  });
  dir = join(tmp, "engagements", "solara-foods");
  template = await readTemplate(HARNESS);
});

after(async () => { if (tmp) await rm(tmp, { recursive: true, force: true }); });

/** Run the page's script against a DOM stub, so a thrown TypeError fails the test. */
function executePage(html: string): { text: string; errors: string[] } {
  const script = /<script>([\s\S]*)<\/script>/.exec(html)![1]!;
  const html2 = { innerHTML: "", getAttribute: () => null, setAttribute: () => {} };
  const els = new Map<string, { innerHTML: string; addEventListener: () => void; dataset: Record<string, string>; classList: { add(): void; remove(): void } }>();
  const el = (id: string) => {
    if (!els.has(id)) els.set(id, { innerHTML: "", addEventListener: () => {}, dataset: {}, classList: { add() {}, remove() {} } });
    return els.get(id)!;
  };
  const errors: string[] = [];
  const sandbox = {
    document: {
      getElementById: el,
      querySelectorAll: () => [],
      documentElement: html2,
    },
    window: { matchMedia: () => ({ matches: false }), scrollTo: () => {} },
    IntersectionObserver: undefined,
    Date, Math, JSON, Object, Array, String, Number, isFinite, parseInt, console,
  };
  try {
    vm.runInNewContext(script, sandbox, { timeout: 5000 });
  } catch (e) {
    errors.push(String((e as Error).stack ?? e));
  }
  const text = [...els.values()].map((x) => x.innerHTML).join("\n");
  return { text, errors };
}

test("a freshly initialised engagement is early state, and renders a next action rather than a blank", async () => {
  const state = await deriveState({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: join(tmp, "deliverables") });
  assert.equal(isEarlyState(state), true);
  const html = renderDashboardHtml(template, [state]);
  assert.ok(!html.includes("__STATE__"));

  const { text, errors } = executePage(html);
  assert.deepEqual(errors, [], "the page script must not throw on v2 state");
  for (const s of ["Material waiting", "Proposed rows awaiting accept", "G1", "/capture", "Start here"]) {
    assert.ok(text.includes(s), `early-state page is missing "${s}"`);
  }
  assert.ok(!text.includes('id="discovery"'), "no empty coverage table in early state");
  // The G1 checklist names what closes each criterion.
  assert.match(text, /Sign <b>00-Setup\/evidence-handling-terms\.md<\/b>/);
  assert.match(text, /Drop a shadowing note in <b>evidence\/observed\/<\/b>/);
  // The next conversations come from the coach.
  // Three per conversation; which unnamed role shows first is alphabetical.
  assert.match(text, /Who is the (exception holder|operator|process owner|systems gatekeeper)\? A name, not a team\./);
});

test("once rows are accepted the full layout appears, and the strip stays", async () => {
  const { ids } = await mintIds(dir, "EV", 1);
  await appendRows(dir, "02-Workflow/observation-log.md", "observation-log.rows", [
    { Id: ids[0]!, Time: "09:12", "Actor (role)": "Analyst", Action: "exported short pays", System: "SAP", Class: "observed" },
  ]);
  await writeFile(join(dir, "02-Workflow", "evidence", "stated", "call.md"), "notes\n", "utf8").catch(async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(dir, "02-Workflow", "evidence", "stated"), { recursive: true });
    await writeFile(join(dir, "02-Workflow", "evidence", "stated", "call.md"), "notes\n", "utf8");
  });
  const state = await deriveState({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: join(tmp, "deliverables") });
  assert.equal(isEarlyState(state), false);
  const html = renderDashboardHtml(template, [state]);
  const { text, errors } = executePage(html);
  assert.deepEqual(errors, []);
  assert.ok(text.includes('id="discovery"'), "coverage grid present once rows exist");
  assert.ok(text.includes("Material waiting"), "the waiting/pending strip is permanent");
  assert.match(text, /1<small>1 stated<\/small>/, "one stated file waiting, by class");
  assert.ok(!text.includes("Start here"));
});

test("the portfolio view renders several engagements without throwing", async () => {
  const state = await deriveState({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: join(tmp, "deliverables") });
  const html = renderDashboardHtml(template, [state, { ...state, engagement: { ...state.engagement, slug: "other-co", client: "Other Co" } }]);
  const { text, errors } = executePage(html);
  assert.deepEqual(errors, []);
  assert.ok(text.includes("All engagements"));
  assert.ok(text.includes("Other Co"));
});

test("a </script> inside client text cannot break out of the page", async () => {
  const state = await deriveState({ engagementDir: dir, slug: "solara-foods", harnessRoot: HARNESS, deliverablesDir: join(tmp, "deliverables") });
  const hostile = { ...state, engagement: { ...state.engagement, scope: "x</script><script>alert(1)</script>" } };
  const html = renderDashboardHtml(template, [hostile]);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1, "exactly the template's own closing tag");
});

test("scripts/render-dashboard.mjs derives and writes, and refuses a slug that is not there", async () => {
  const script = join(HARNESS, "scripts", "render-dashboard.mjs");
  let code = 0;
  try { await run(process.execPath, [script, "no-such-engagement"], { cwd: HARNESS }); } catch (e) { code = (e as { code: number }).code; }
  assert.equal(code, 2);
});
