/**
 * Request-level protections.
 *
 * Ported from the ontology repo's `lib/http.ts`. Two changes on the way over:
 * the rate limiter now evicts expired buckets (the original leaked one Map
 * entry per IP, forever), and it is honest about being per-instance — on
 * serverless it is a speed bump, not a limit. Replace with Upstash before
 * this matters.
 */

import { NextResponse } from "next/server";

/**
 * CSRF defence: same-origin check, **fail-closed**.
 *
 * A request with neither Origin nor Referer is rejected. That breaks
 * cross-origin clients by design — this app is same-origin only.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Public message to the client; detail to the server log only. */
export function safeError(status: number, publicMessage: string, detail?: unknown) {
  if (detail !== undefined) console.error(`[${status}] ${publicMessage}`, detail);
  return NextResponse.json({ error: publicMessage }, { status });
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window counter, per instance.
 *
 * Not authoritative on serverless — several lambdas each keep their own
 * window. Kept because a speed bump on a single warm instance still blunts
 * naive hammering, and because leaving the call sites in place means
 * swapping in a shared store later is a one-file change.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Evict expired buckets. The original never did, which is an unbounded
  // memory leak keyed by IP on a long-lived instance.
  if (buckets.size > 512) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export function clientKey(req: Request, suffix: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return `${ip}:${suffix}`;
}
