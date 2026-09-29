/**
 * Constant-time comparison, on `node:crypto` only.
 *
 * This file used to carry scrypt password hashing, signed expiring tokens and
 * a UUID helper, ported from the ontology repo in case they were needed.
 * Nothing called them. Security code nobody exercises is code nobody reviews;
 * bring each one back with the feature that needs it.
 */

import { timingSafeEqual } from "node:crypto";

/** Constant-time equality for a plain shared secret, e.g. the ingest key. */
export function secretEquals(given: string | null | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
