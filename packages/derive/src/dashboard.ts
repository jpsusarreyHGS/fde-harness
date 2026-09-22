/**
 * Render the dashboard: state in, one self-contained HTML file out.
 *
 * Until now the render step was prose — "substitute the state as a JSON
 * blob into the STATE placeholder" — executed by an agent against an
 * 822-line template. That is how the template drifted a whole schema
 * version behind the state it was fed: the engagement view read `phases[]`
 * and `useCases[]`, neither of which v2 has, threw on the first access, and
 * painted nothing. A trainee looked at that and concluded the dashboard
 * needed every G1 question answered before it would show anything.
 *
 * So the substitution is code, and the early-state layout is the first
 * thing the test checks: a freshly initialised engagement renders what is
 * waiting, what is pending, the G1 checklist and the next conversations —
 * never a blank page, never a red wall with no next action.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { State } from "./state.ts";

export const TEMPLATE_PATH = ".claude/skills/skills-function/render-dashboard/dashboard-template.html";
/**
 * The exact line replaced. Matching the assignment rather than the bare
 * token means a mention of the token in a comment cannot swallow the
 * substitution — which is precisely what the first version did.
 */
const TOKEN = "var STATE = __STATE__;";

/**
 * The state objects the dashboard should treat as "nothing has been
 * accepted into discovery yet". Stage 01–03 coverage instruments with rows.
 * Stage 00 is excluded on purpose: setup fields are answered at init and
 * would make every fresh engagement look like it had started discovery.
 */
export function isEarlyState(s: State): boolean {
  // Open questions are excluded: they are what the engagement does not know
  // yet, and /init-engagement raises several for every TBD. Counting them
  // would mean a fresh engagement was never "early".
  return !s.instruments.some((i) =>
    ["01", "02", "03"].includes(i.stage) && i.id !== "open-questions" && i.rows > 0,
  );
}

/**
 * Substitute the states into the template.
 *
 * `</script>` inside a JSON string would end the script block early and
 * hand the rest of the state to the HTML parser; it is escaped the way every
 * JSON-in-HTML embedding has to. `<!--` is escaped for the same reason.
 */
export function renderDashboardHtml(template: string, states: readonly State[]): string {
  const hits = template.split(TOKEN).length - 1;
  if (hits !== 1) {
    throw new Error(`dashboard template must contain "${TOKEN}" exactly once; found ${hits}`);
  }
  const json = JSON.stringify(states)
    .replace(/<\/script/gi, "<\\/script")
    .replace(/<!--/g, "<\\!--");
  const out = template.replace(TOKEN, `var STATE = ${json};`);
  if (/\b__STATE__\b/.test(out)) {
    throw new Error("the rendered page still mentions __STATE__ — a second token would read as unrendered");
  }
  return out;
}

export async function readTemplate(harnessRoot: string): Promise<string> {
  return readFile(join(harnessRoot, ...TEMPLATE_PATH.split("/")), "utf8");
}
