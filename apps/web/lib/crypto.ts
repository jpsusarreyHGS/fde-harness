/**
 * Signing and hashing, on `node:crypto` only.
 *
 * Ported from the ontology repo's `lib/crypto.ts` — 76 lines with zero
 * dependencies, correct scrypt plus HMAC plus constant-time comparison. The
 * one change made on the way over: the hash format now carries its cost
 * parameters, so they can be re-tuned later without a second format.
 */

import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const MIN_SECRET_LEN = 16;
let cachedSecret: Buffer | null = null;

/** scrypt cost. Stored per-hash so these can move without breaking old hashes. */
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

function secret(): Buffer {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.APP_SECRET;
  if (!raw || raw.length < MIN_SECRET_LEN) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `APP_SECRET must be set and at least ${MIN_SECRET_LEN} characters in production.`,
      );
    }
    // Dev only: sessions and tokens die on restart, which is the correct
    // trade — a stable dev default is a production secret waiting to happen.
    console.warn("[crypto] APP_SECRET unset; using an ephemeral dev secret.");
    cachedSecret = randomBytes(32);
    return cachedSecret;
  }
  cachedSecret = Buffer.from(raw, "utf8");
  return cachedSecret;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4];
  const expected = parts[5];
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  if (!salt || !expected) return false;
  let actual: Buffer;
  try {
    actual = scryptSync(password, Buffer.from(salt, "hex"), expected.length / 2, { N, r, p });
  } catch {
    return false;
  }
  const want = Buffer.from(expected, "hex");
  if (want.length !== actual.length) return false;
  return timingSafeEqual(want, actual);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * A signed, expiring token. Payload is signed but **not encrypted** — never
 * put anything in it the holder should not read.
 */
export function signToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/** Returns the payload, or `null` for anything malformed, mis-signed or expired. */
export function verifyToken<T extends Record<string, unknown>>(token: string): T | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = createHmac("sha256", secret()).update(encoded).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T & {
      exp?: number;
    };
    if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Constant-time equality for a plain shared secret, e.g. the ingest key. */
export function secretEquals(given: string | null | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function newId(): string {
  return randomUUID();
}
