/**
 * The ROI model, computed.
 *
 * The runbook defines the arithmetic precisely; the harness reproduced only
 * the labels and an "Arithmetic" column filled in by hand, while `/roi`
 * promised to show the working. These tests hold the formulas to the
 * runbook's, and pin the two places a convenient answer is easier than a
 * defensible one.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseAnchoredTables } from "../src/anchors.ts";
import { computeRoi, ROI_INPUTS } from "../src/roi.ts";

function model(values: (string | number)[], provenance = "measured", buckets = "") {
  const rows = ROI_INPUTS.map((label, i) => `| ${i + 1} | ${label} | | ${values[i] ?? ""} | | ${provenance} |`).join("\n");
  return parseAnchoredTables(`
<!-- table:roi-model.inputs role=labels key=Input answer=Actual (measured) -->

| # | Input | Baseline (stage 04) | Actual (measured) | Source | Measured / modelled / assumed |
|---|---|---|---|---|---|
${rows}

<!-- table:roi-model.buckets role=register id=Bucket -->

| Bucket | Effect | Arithmetic or evidence | Measured / modelled / assumed | Owner |
|---|---|---|---|---|
${buckets}
`);
}

// 2,000 instances · 12 min · 60% automated · £45/h · 4% → 1% errors · £90 each
// · £60,000 build · £1,200/month run.
const REAL: (string | number)[] = [2000, 12, 60, 45, 4, 1, 90, 60000, 1200];

test("the four outputs follow the runbook's arithmetic", () => {
  const r = computeRoi(model(REAL));
  // hours = (2000 × 12 × 0.6) / 60 = 240
  assert.equal(r.outputs.hoursRecovered, 240);
  // labour = 240 × 45 = 10,800 · risk = 2000 × 0.03 × 90 = 5,400
  // net = 10,800 + 5,400 − 1,200 = 15,000
  assert.equal(r.outputs.netBenefitPerMonth, 15000);
  // year one = 15,000 × 12 − 60,000 = 120,000
  assert.equal(r.outputs.yearOneNet, 120000);
  // payback = 60,000 / 15,000 = 4 months
  assert.equal(r.outputs.paybackMonths, 4);
});

test("the arithmetic is shown with the numbers in it", () => {
  // "Show the arithmetic. The first question will be where the number came
  // from." A result with no working cannot answer that question.
  const r = computeRoi(model(REAL));
  assert.equal(r.outputs.workings.length, 6);
  assert.match(r.outputs.workings[0]!, /hours = \(2,000 × 12 min × 60%\) ÷ 60 = 240/);
  assert.match(r.outputs.workings.join("\n"), /payback = 60,000 ÷ 15,000 = 4\.0 months/);
});

test("a missing input produces no output, never a zero", () => {
  // A zero reads as a computed result. "Use conservative inputs — a
  // defensible number beats an impressive one."
  const noRate = [...REAL];
  noRate[3] = "";
  const r = computeRoi(model(noRate));
  assert.equal(r.outputs.hoursRecovered, 240, "hours does not depend on the rate");
  assert.equal(r.outputs.netBenefitPerMonth, null);
  assert.equal(r.outputs.yearOneNet, null);
  assert.equal(r.outputs.paybackMonths, null);
  assert.deepEqual(r.missing, ["Loaded hourly cost"]);
});

test("an error rate that got worse is not netted off as a saving", () => {
  const worse = [...REAL];
  worse[4] = 1; worse[5] = 4;          // 1% → 4%: it got worse
  const r = computeRoi(model(worse));
  // risk contribution is zero, not negative — the model must not absorb a
  // regression into a smaller benefit. It is a counter-metric finding.
  assert.equal(r.outputs.netBenefitPerMonth, 10800 - 1200);
  assert.match(r.outputs.workings.join("\n"), /error rate rose; the model does not net this off/);
});

test("a system that does not pay back says so", () => {
  const costly = [...REAL];
  costly[8] = 99000;                    // run cost swamps the benefit
  const r = computeRoi(model(costly));
  assert.ok(r.outputs.netBenefitPerMonth! < 0);
  assert.equal(r.outputs.paybackMonths, null, "never a negative number of months");
  assert.match(r.outputs.workings.join("\n"), /payback = never at the current net benefit/);
});

test("currency symbols and separators parse", () => {
  const messy = ["2,000", "12", "60%", "£45", "4%", "1%", "£90", "£60,000", "£1,200"];
  assert.equal(computeRoi(model(messy)).outputs.netBenefitPerMonth, 15000);
});

test("provenance is counted, because an unlabelled figure reads as measured", () => {
  assert.equal(computeRoi(model(REAL, "measured")).measured, 9);
  assert.equal(computeRoi(model(REAL, "assumed")).measured, 0);
  assert.equal(computeRoi(model(REAL, "")).measured, 0);
});

test("all three buckets are tracked, and revenue uplift is not optional", () => {
  // "There are exactly three buckets a business cares about, and every
  // deployed system should be measured against all three." The model had no
  // line for revenue uplift at all.
  const none = computeRoi(model(REAL));
  assert.deepEqual(none.buckets, { costSavings: false, revenueUplift: false, riskMitigation: false });

  const two = computeRoi(model(REAL, "measured", `| Cost savings | 240 h/month returned | see outputs | measured | Marta |
| Revenue uplift | | | | |
| Risk mitigation | 3pp fewer mis-routes | 2000 × 3% × £90 | measured | Marta |`));
  assert.deepEqual(two.buckets, { costSavings: true, revenueUplift: false, riskMitigation: true });
});
