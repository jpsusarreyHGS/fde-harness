/**
 * The runner POSTs derived state here.
 *
 * Authenticated by a shared secret in `x-ingest-key`, compared in constant
 * time. Not a session — the caller is a machine on a schedule, and giving it
 * a browser session would mean a browser could impersonate it.
 */

import { secretEquals } from "@/lib/crypto";
import { clientKey, rateLimit, safeError } from "@/lib/http";
import { ingestState, type EngagementState } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "ingest"), 60, 60_000)) {
    return safeError(429, "too many requests");
  }

  const expected = process.env.INGEST_SECRET;
  if (!expected) {
    return safeError(503, "ingest not configured", "INGEST_SECRET unset");
  }
  if (!secretEquals(req.headers.get("x-ingest-key"), expected)) {
    return safeError(401, "unauthorised");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    return safeError(400, "invalid JSON", err);
  }

  const state = body as EngagementState;
  if (!state || typeof state !== "object" || !state.engagement) {
    return safeError(400, "not an engagement state document");
  }

  try {
    const result = await ingestState(state);
    if (result.stored === "rejected") {
      // A rejection is the system working. Say exactly why, so the runner's
      // log carries something actionable rather than a bare 4xx.
      return safeError(422, result.note ?? "rejected");
    }
    return Response.json({ stored: result.stored, slug: result.slug });
  } catch (err) {
    return safeError(500, "ingest failed", err);
  }
}
