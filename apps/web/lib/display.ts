/**
 * Display helpers shared by the pages.
 *
 * The status colour mapping is fixed on purpose: an FDE reading two views
 * should never have to re-learn what a colour means.
 */

export const STATUS_PILL: Record<string, string> = {
  // gates
  passed: "pass",
  ready: "active",
  caveats: "caveat",
  "not-ready": "fail",
  "not-run": "idle",
  // stages
  complete: "pass",
  active: "active",
  "not-started": "idle",
  blocked: "fail",
  // instruments
  populated: "pass",
  thin: "caveat",
  empty: "idle",
  // criteria
  met: "pass",
  partial: "caveat",
  unmet: "fail",
};

export const GATE_LABEL: Record<string, string> = {
  "not-run": "Not run",
  ready: "Ready",
  caveats: "Ready with caveats",
  "not-ready": "Not ready",
  passed: "Passed",
};

export const STATUS_VAR: Record<string, string> = {
  populated: "var(--pass)",
  thin: "var(--caveat)",
  empty: "var(--idle)",
};

export function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

/** Colour a ratio by how close to whole it is. */
export function ratioColour(p: number, whenZeroDenominator = "var(--idle)"): string {
  if (Number.isNaN(p)) return whenZeroDenominator;
  if (p >= 90) return "var(--pass)";
  if (p >= 60) return "var(--caveat)";
  return "var(--fail)";
}

/** Age in whole days, computed at read time — never stored. */
export function ageDays(raised: string | undefined, now = new Date()): number | null {
  if (!raised) return null;
  const d = new Date(raised);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

export function ageClass(days: number | null): string {
  if (days === null) return "";
  if (days >= 14) return "stale";
  if (days >= 7) return "old";
  return "";
}

export function bytes(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}

/** First non-empty value from a row, tolerating header drift. */
export function cell(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    const v = row[n];
    if (v !== undefined && v.trim() !== "") return v;
  }
  return "";
}
