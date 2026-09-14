/**
 * The ROI model, computed.
 *
 * The runbook defines this arithmetic precisely and the harness reproduced
 * only its *interface* — nine input labels and four output labels, with an
 * "Arithmetic" column an FDE filled in by hand. `/roi` promised to "show the
 * arithmetic for each" and no formula existed anywhere in the repo.
 *
 * That is the exact failure the runbook warns about: **"Show the arithmetic.
 * The first question will be where the number came from."** A number typed
 * into a cell cannot answer that question, and the person who typed it will be
 * asked in front of the sponsor.
 *
 * Two rules the runbook attaches, both enforced here:
 *
 *   - **"Use conservative inputs — a defensible number beats an impressive
 *     one."** So a missing input produces no output, never a zero that reads
 *     as a computed result.
 *   - **"There are exactly three buckets a business cares about, and every
 *     deployed system should be measured against all three."** Cost savings,
 *     revenue uplift, risk mitigation. The model had no bucket dimension and
 *     no line for revenue uplift at all, so a third of the mandatory frame was
 *     structurally unreportable.
 */

import { dataRows, findTable, type ParsedTable } from "./anchors.ts";

/** The nine, in the runbook's order. */
export const ROI_INPUTS = [
  "Instances per month",
  "Minutes per instance (today)",
  "% handled without a human",
  "Loaded hourly cost",
  "Error rate today (%)",
  "Error rate after (%)",
  "Cost per error",
  "Build cost (one-off)",
  "Run cost per month",
] as const;

export type Provenance = "measured" | "modelled" | "assumed" | "unstated";

export interface RoiInput {
  label: string;
  value: number | null;
  provenance: Provenance;
}

export interface RoiOutputs {
  hoursRecovered: number | null;
  netBenefitPerMonth: number | null;
  paybackMonths: number | null;
  yearOneNet: number | null;
  /** The arithmetic, rendered — one line per output, with the numbers in it. */
  workings: string[];
}

export interface RoiModel {
  inputs: RoiInput[];
  /** Inputs with no value. An output depending on one is null, not zero. */
  missing: string[];
  /** How many of the nine are measured rather than modelled or assumed. */
  measured: number;
  outputs: RoiOutputs;
  /** The three buckets, and whether each has been addressed. */
  buckets: { costSavings: boolean; revenueUplift: boolean; riskMitigation: boolean };
}

/** Strip currency, thousands separators and a trailing % before parsing. */
function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const s = raw.replace(/[^0-9.\-]/g, "");
  if (!s || s === "-" || s === ".") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function provenanceOf(raw: string): Provenance {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("measur")) return "measured";
  if (s.startsWith("model")) return "modelled";
  if (s.startsWith("assum")) return "assumed";
  return "unstated";
}

function cell(r: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const v = r[n];
    if (v !== undefined) return v.trim();
  }
  return "";
}

function money(n: number): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

/**
 * Compute the four outputs from the nine inputs.
 *
 * The runbook's model, unchanged:
 *
 *   hours   = (vol × mins × auto) / 60
 *   labour  = hours × rate
 *   riskVal = vol × max(err − errNew, 0) × errCost
 *   net     = labour + riskVal − run
 *   yearOne = net × 12 − build
 *   payback = build / net
 *
 * `max(err − errNew, 0)` matters: an error rate that got *worse* must not
 * subtract from the benefit and quietly look like a saving. It is a
 * counter-metric finding, and the model should not absorb it.
 */
export function computeRoi(tables: readonly ParsedTable[]): RoiModel {
  const t = findTable(tables as ParsedTable[], "roi-model.inputs");
  const rows = t ? dataRows(t) : [];

  const inputs: RoiInput[] = ROI_INPUTS.map((label) => {
    const row = rows.find((r) => cell(r, "Input").toLowerCase().startsWith(label.slice(0, 14).toLowerCase()));
    return {
      label,
      // Actuals first. A baseline is what we expected, not what happened.
      value: row ? num(cell(row, "Actual (measured)", "Actual")) ?? num(cell(row, "Baseline (stage 04)", "Baseline")) : null,
      provenance: row ? provenanceOf(cell(row, "Measured / modelled / assumed")) : "unstated",
    };
  });

  const v = (i: number) => inputs[i]!.value;
  const [vol, mins, auto, rate, err, errNew, errCost, build, run] =
    [v(0), v(1), v(2), v(3), v(4), v(5), v(6), v(7), v(8)];

  const missing = inputs.filter((i) => i.value === null).map((i) => i.label);
  const measured = inputs.filter((i) => i.provenance === "measured").length;

  const workings: string[] = [];
  let hours: number | null = null;
  if (vol !== null && mins !== null && auto !== null) {
    hours = (vol * mins * (auto / 100)) / 60;
    workings.push(`hours = (${money(vol)} × ${mins} min × ${auto}%) ÷ 60 = ${money(hours)}`);
  }

  let labour: number | null = null;
  if (hours !== null && rate !== null) {
    labour = hours * rate;
    workings.push(`labour = ${money(hours)} h × ${money(rate)} = ${money(labour)}`);
  }

  let riskVal: number | null = null;
  if (vol !== null && err !== null && errNew !== null && errCost !== null) {
    const avoided = Math.max(err - errNew, 0);
    riskVal = vol * (avoided / 100) * errCost;
    workings.push(
      `risk = ${money(vol)} × max(${err}% − ${errNew}%, 0) × ${money(errCost)} = ${money(riskVal)}` +
        (err < errNew ? "  ← error rate rose; the model does not net this off" : ""),
    );
  }

  let net: number | null = null;
  if (labour !== null && riskVal !== null && run !== null) {
    net = labour + riskVal - run;
    workings.push(`net / month = ${money(labour)} + ${money(riskVal)} − ${money(run)} = ${money(net)}`);
  }

  let yearOneNet: number | null = null;
  if (net !== null && build !== null) {
    yearOneNet = net * 12 - build;
    workings.push(`year one = ${money(net)} × 12 − ${money(build)} = ${money(yearOneNet)}`);
  }

  let paybackMonths: number | null = null;
  if (net !== null && build !== null && net > 0) {
    paybackMonths = build / net;
    workings.push(`payback = ${money(build)} ÷ ${money(net)} = ${paybackMonths.toFixed(1)} months`);
  } else if (net !== null && net <= 0) {
    // Never render this as a huge or negative number of months. It does not
    // pay back, and saying so is the honest output.
    workings.push("payback = never at the current net benefit");
  }

  // The three the runbook says every deployed system is measured against.
  const bt = findTable(tables as ParsedTable[], "roi-model.buckets");
  const bucketRows = bt ? dataRows(bt) : [];
  const addressed = (name: string) =>
    bucketRows.some(
      (r) =>
        cell(r, "Bucket").toLowerCase().includes(name) &&
        !["", "-", "—", "n/a", "tbd"].includes(cell(r, "Effect").toLowerCase()),
    );

  return {
    inputs,
    missing,
    measured,
    outputs: { hoursRecovered: hours, netBenefitPerMonth: net, paybackMonths, yearOneNet, workings },
    buckets: {
      costSavings: addressed("cost"),
      revenueUplift: addressed("revenue"),
      riskMitigation: addressed("risk"),
    },
  };
}
