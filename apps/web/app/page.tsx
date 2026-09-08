import { listEngagements, storeInfo } from "@/lib/store";
import { GATE_LABEL } from "@/lib/display";

export const dynamic = "force-dynamic";

/** Gate statuses ranked by how much they need attention. */
const ATTENTION: Record<string, number> = {
  "not-ready": 0,
  caveats: 1,
  "not-run": 2,
  ready: 3,
  passed: 4,
};

export default async function Portfolio() {
  const [engagements, info] = await Promise.all([listEngagements(), storeInfo()]);

  const ranked = [...engagements].sort((a, b) => {
    const worst = (gs: { status: string }[]) =>
      Math.min(...(gs.length ? gs.map((g) => ATTENTION[g.status] ?? 5) : [5]));
    return worst(a.gates ?? []) - worst(b.gates ?? []);
  });

  const totals = engagements.reduce(
    (acc, e) => {
      acc.proposals += e.harnessImprover?.openProposals ?? 0;
      acc.pending += e.harnessImprover?.pendingPromptEdits ?? 0;
      acc.findings += e.chain?.audit?.findings?.length ?? 0;
      acc.questions += e.openQuestions?.length ?? 0;
      return acc;
    },
    { proposals: 0, pending: 0, findings: 0, questions: 0 },
  );

  return (
    <>
      <section className="mast">
        <div className="wrap">
          <div className="top">
            <div>
              <h1>All engagements</h1>
              <div className="who">
                {engagements.length} tracked · derived from each engagement&rsquo;s{" "}
                <b>state.json</b>
              </div>
            </div>
            <div className="gen">
              Store: <code>{info.backend}</code>
              <br />
              {info.backend === "filesystem" && <>Reading <code>engagements/*/state.json</code></>}
            </div>
          </div>
          <div style={{ height: 24 }} />
        </div>
      </section>

      <div className="wrap">
        {engagements.length === 0 && (
          <section className="sec">
            <div className="banner info">
              <div className="k">Nothing yet</div>
              <p>
                No engagement has derived state. Scaffold one with{" "}
                <b>/init-engagement</b>, then run <b>/dashboard</b> to derive it.
                {info.backend === "filesystem" && (
                  <>
                    {" "}
                    This console is reading from <b>{info.path}</b> — set{" "}
                    <b>DATABASE_URL</b> to read from Postgres instead.
                  </>
                )}
              </p>
            </div>
          </section>
        )}

        {engagements.length > 0 && (
          <section className="sec">
            <div className="sec-h">
              <h2>Portfolio</h2>
              <div className="note">
                Sorted by what needs attention: failed or caveated gates first.
              </div>
            </div>
            <div className="pf">
              {ranked.map((e) => {
                const slug = e.engagement["slug"] ?? "";
                const c = e.chain;
                const alerts: string[] = [];

                for (const g of e.gates ?? []) {
                  if (g.status === "not-ready") alerts.push(`${g.id} not ready`);
                  else if (g.status === "caveats") alerts.push(`${g.id} carries caveats`);
                }
                if (!e.engagement["sponsor"] || e.engagement["sponsor"] === "TBD") {
                  alerts.push("No named sponsor");
                }
                if (e.engagement["residency"] === "tbd") {
                  alerts.push("Residency unsettled — capture blocked");
                }
                const labour = e.engagement["labour"];
                if (labour === "works-council" || labour === "union") {
                  alerts.push("Monitoring needs consultation");
                } else if (labour === "unknown") {
                  alerts.push("Labour representation unknown");
                }
                if (c?.audit?.danglingCitations) {
                  alerts.push(`${c.audit.danglingCitations} dangling citation(s)`);
                }
                if (c?.audit?.unsourcedRequirements) {
                  alerts.push(`${c.audit.unsourcedRequirements} unsourced requirement(s)`);
                }
                for (const a of e.autonomy ?? []) {
                  if (a["agreement"] === null || a["agreement"] === undefined) {
                    alerts.push(`${String(a["workflow"])} rung asserted, not measured`);
                  }
                }

                return (
                  <a className="pfc" key={slug} href={`/e/${slug}`}>
                    <div>
                      <div className="ph2">
                        {(e.engagement["stage"] ?? "—").replace(/^\d\d-/, "")}
                      </div>
                      <h3>{e.engagement["client"] ?? slug}</h3>
                      <div className="sc">{e.engagement["scope"] ?? ""}</div>
                    </div>
                    <div className="mini">
                      {(e.stages ?? []).map((s) => (
                        <i
                          key={s.id}
                          style={{
                            background:
                              s.status === "complete"
                                ? "var(--pass)"
                                : s.status === "active"
                                  ? "var(--active)"
                                  : s.status === "blocked"
                                    ? "var(--fail)"
                                    : "var(--line-soft)",
                          }}
                        />
                      ))}
                    </div>
                    <div className="kv">
                      <div>
                        Evidence <b>{c?.evidence?.total ?? 0}</b>
                      </div>
                      <div>
                        Reqs <b>{c?.requirements?.total ?? 0}</b>
                      </div>
                      <div>
                        CQ <b>{c?.competencyQuestions?.answerable ?? 0}/
                        {c?.competencyQuestions?.total ?? 0}</b>
                      </div>
                      <div>
                        Open Qs <b>{e.openQuestions?.length ?? 0}</b>
                      </div>
                    </div>
                    {alerts.length > 0 ? (
                      alerts.slice(0, 3).map((a) => (
                        <div className="alert" key={a}>
                          {a}
                        </div>
                      ))
                    ) : (
                      <div className="kv" style={{ color: "var(--ink-3)" }}>
                        Nothing flagged
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {engagements.length > 0 && (
          <section className="sec">
            <div className="sec-h">
              <h2>Practice health</h2>
              <div className="note">
                Whether engagement N+1 is getting cheaper than N.
              </div>
            </div>
            <div className="ops">
              <div className="op">
                <div className="k">Open proposals</div>
                <div className="v">{totals.proposals}</div>
                <div className="d">
                  Harness improvements awaiting per-proposal approval.
                </div>
              </div>
              <div className="op">
                <div className="k">Pending prompt edits</div>
                <div className="v">{totals.pending}</div>
                <div className="d">
                  Agent-prompt changes held in feedback for deliberate promotion.{" "}
                  <b>Never auto-applied.</b>
                </div>
              </div>
              <div className="op">
                <div className="k">Audit findings</div>
                <div
                  className="v"
                  style={{ color: totals.findings ? "var(--caveat)" : "var(--ink)" }}
                >
                  {totals.findings}
                </div>
                <div className="d">
                  Broken links in the judgment chain, across all engagements.
                </div>
              </div>
              <div className="op">
                <div className="k">Open questions</div>
                <div className="v">{totals.questions}</div>
                <div className="d">
                  Unanswered, blocking something. Age is computed at read time.
                </div>
              </div>
            </div>
          </section>
        )}

        {engagements.length > 0 && (
          <section className="sec">
            <div className="card">
              <div className="card-h">
                <h3>Gate status across the portfolio</h3>
              </div>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Engagement</th>
                      <th>G1 — Discovery</th>
                      <th>G2 — Build</th>
                      <th>G3 — Production</th>
                      <th>Decided by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((e) => {
                      const slug = e.engagement["slug"] ?? "";
                      const g = (id: string) => e.gates?.find((x) => x.id === id);
                      return (
                        <tr key={slug}>
                          <td>
                            <b>{e.engagement["client"] ?? slug}</b>
                          </td>
                          {["G1", "G2", "G3"].map((id) => {
                            const gate = g(id);
                            const st = gate?.status ?? "not-run";
                            return (
                              <td key={id}>
                                <span className={`pill ${st === "passed" ? "pass" : st === "ready" ? "active" : st === "caveats" ? "caveat" : st === "not-ready" ? "fail" : "idle"}`}>
                                  {GATE_LABEL[st] ?? st}
                                </span>
                              </td>
                            );
                          })}
                          <td>
                            {e.gates?.filter((x) => x.decidedBy).map((x) => `${x.id}: ${x.decidedBy}`).join(" · ") || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="legend">
                <span>
                  A gate derives only as far as <b>&nbsp;ready</b>. Only a person sets{" "}
                  <b>&nbsp;passed</b>, with their name.
                </span>
              </div>
            </div>
          </section>
        )}
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}
