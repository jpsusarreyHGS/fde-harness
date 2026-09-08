/** Portfolio data, for anything that wants it as JSON rather than HTML. */

import { listEngagements, storeInfo } from "@/lib/store";
import { safeError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [engagements, info] = await Promise.all([listEngagements(), storeInfo()]);
    return Response.json({
      backend: info.backend,
      count: engagements.length,
      engagements: engagements.map((e) => ({
        slug: e.engagement["slug"],
        client: e.engagement["client"] ?? e.engagement["slug"],
        stage: e.engagement["stage"] ?? null,
        generatedAt: e.generatedAt,
        gates: e.gates?.map((g) => ({ id: g.id, status: g.status })) ?? [],
        auditFindings: e.chain?.audit?.findings?.length ?? 0,
      })),
    });
  } catch (err) {
    return safeError(500, "could not list engagements", err);
  }
}
