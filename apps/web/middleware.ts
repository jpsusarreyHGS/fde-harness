/**
 * Default-on protection.
 *
 * The ontology repo had no middleware, so every route was public until
 * someone remembered to call `getSessionFromRequest` in it. That is a footgun
 * at six routes and a liability at thirty. Here the default is closed and
 * exceptions are explicit.
 *
 * In this phase the human-facing gate is **Vercel Deployment Protection** at
 * the edge — see `README.md`. This middleware guards the API surface, which
 * sits behind that but must not rely on it: the ingest endpoint is called by
 * a runner, not a browser, so it authenticates itself.
 */

import { NextResponse, type NextRequest } from "next/server";

/** Paths that authenticate themselves and must not be blanket-blocked. */
const SELF_AUTHENTICATING = ["/api/ingest"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (SELF_AUTHENTICATING.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Mutating requests to any other API route are refused outright: this
  // phase is read-only, and the write surface arrives with the approval
  // inbox. Refusing now means a route added later cannot become
  // accidentally writable just by existing.
  if (pathname.startsWith("/api/") && req.method !== "GET" && req.method !== "HEAD") {
    return NextResponse.json(
      { error: "This console is read-only in this phase." },
      { status: 405 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
