import { notFound } from "next/navigation";
import { getEngagement } from "@/lib/store";
import {
  ageClass, ageDays, cell, GATE_LABEL, pct, ratioColour, STATUS_PILL, STATUS_VAR, bytes,
} from "@/lib/display";

export const dynamic = "force-dynamic";

export default async function Engagement({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = await getEngagement(slug);
  if (!e) notFound();

  const c = e.chain;
  const ident = e.engagement;

  // The chain, as an attrition funnel. Each link shows what survived it.
  const links = [
    { stage: "Observed", n: c.evidence.observed, of: c.evidence.total, ofl: "evidence rows", note: "primary evidence" },
    { stage: "Exceptions", n: c.exceptions.withRuleHolder, of: c.exceptions.total, ofl: "logged", note: "with a named rule holder" },
    { stage: "Requirements", n: c.requirements.sourced, of: c.requirements.total, ofl: "in register", note: "carrying a source" },
    { stage: "Allocations", n: c.allocations.withReason, of: c.allocations.total, ofl: "steps placed", note: "with a written reason" },
    { stage: "Ontology", n: c.ontologyObjects.promoted, of: c.ontologyObjects.promoted + c.ontologyObjects.backlog, ofl: "candidates", note: "promoted" },
    { stage: "Competency Qs", n: c.competencyQuestions.answerable, of: c.competencyQuestions.total, ofl: "written", note: "answerable" },
    { stage: "Eval cases", n: c.evalCases.passing, of: c.evalCases.total, ofl: "cases", note: "passing" },
  ];

  const r1 = pct(c.requirements.sourced, c.requirements.total);
  const r2 = pct(c.exceptions.withRuleHolder, c.exceptions.total);
  const r3 = pct(c.allocations.withReason, c.allocations.total);
  const r4 = pct(c.competencyQuestions.answerable, c.competencyQuestions.total);

  const openGate = e.gates?.find((g) => g.criteria.length > 0);
  const maxRows = Math.max(1, ...e.instruments.map((i) => i.rows));
  const labour = ident["labour"];

  return (
    <>
      <section className="mast">
        <div className="wrap">
          <div className="top">
            <div>
              <h1>{ident["client"] ?? slug}</h1>
              <div className="who">
                {ident["scope"] ?? ""} · sponsor <b>{ident["sponsor"] ?? "unnamed"}</b>
                {ident["residency"] && <> · residency <b>{ident["residency"]}</b></>}
              </div>
            </div>
            <div className="gen">
              {e.sessions?.latest && (
                <>
                  Session <code>{e.sessions.latest}</code> · {e.sessions.count} logged
                  <br />
                </>
              )}
              Derived {new Date(e.generatedAt).toISOString().slice(0, 16).replace("T", " ")} UTC
            </div>
          </div>

          <div className="pipe">
            {e.stages.map((s) => (
              <div className={`ph ${s.status}`} key={s.id}>
                <div className="n">{s.id}</div>
                <div className="t">{s.label}</div>
                <div className="p">{s.pct}%</div>
              </div>
            ))}
          </div>

          <div className="gates">
            {e.gates.map((g) => (
              <div className={`gate ${g.status}`} key={g.id}>
                <span className="dot" />
                <span className="g">{g.id}</span>
                <span className="s">{GATE_LABEL[g.status] ?? g.status}</span>
                <span className="m">
                  {g.criteria.length
                    ? `${g.criteria.filter((x) => x.status === "met").length}/${g.criteria.length} criteria`
                    : (g.date ?? "—")}
                </span>
              </div>
            ))}
          </div>

          {ident["residency"] === "tbd" && (
            <div className="banner stop">
              <div className="k">Capture blocked</div>
              <p>
                Evidence residency is unsettled.{" "}
                <b>discovery-analyst hard-stops until the handling terms are signed</b> —
                evidence captured under unresolved terms may have to be destroyed, and
                destroying discovery evidence means redoing discovery.
              </p>
            </div>
          )}

          {(labour === "works-council" || labour === "union" || labour === "unknown") && (
            <div className="banner">
              <div className="k">Monitoring</div>
              <p>
                Labour representation: <b>{labour}</b>. Desktop task mining and session
                replay are employee monitoring, and here they require{" "}
                <b>consultation, not notice</b> — a process with a counterparty who can
                say no. Prefer consented, time-boxed shadowing; it produces better
                material anyway.
              </p>
            </div>
          )}

          <div style={{ height: 22 }} />
        </div>
      </section>

      <div className="wrap">
        {/* ===== the chain ===== */}
        <section className="sec" id="chain">
          <div className="sec-h">
            <h2>Judgment chain</h2>
            <div className="note">
              map → grid → spec → build → eval → claim. Attrition at a link is where the
              work is.
            </div>
          </div>
          <div className="card">
            <div className="card-b">
              <div className="chain">
                {links.map((l) => {
                  const p = pct(l.n, l.of);
                  const col = l.of === 0 ? "var(--line-soft)" : ratioColour(p);
                  const cls = l.of === 0 ? "ok" : p >= 90 ? "ok" : p >= 60 ? "warn" : "bad";
                  return (
                    <div className="link" key={l.stage}>
                      <div className="stage">{l.stage}</div>
                      <div className="num">{l.n}</div>
                      <div className="of">
                        of {l.of} {l.ofl}
                      </div>
                      <div className={`att ${cls}`}>
                        {l.of === 0 ? "—" : `${p}% ${l.note}`}
                      </div>
                      <div className="track">
                        <div className="fill" style={{ width: `${p}%`, background: col }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ratios">
                <div className="ratio">
                  <div className="k">Sourcing discipline</div>
                  <div className="v" style={{ color: c.requirements.total ? (r1 === 100 ? "var(--pass)" : "var(--fail)") : "var(--idle)" }}>
                    {c.requirements.total ? `${r1}%` : "—"}
                    <small>
                      {c.requirements.sourced}/{c.requirements.total}
                    </small>
                  </div>
                  <div className="d">
                    {c.audit.unsourcedRequirements > 0 ? (
                      <>
                        <b>{c.audit.unsourcedRequirements} unsourced</b> rows sit in the
                        register looking sourced. These block modelling.
                      </>
                    ) : (
                      "Every requirement cites evidence."
                    )}
                  </div>
                </div>
                <div className="ratio">
                  <div className="k">Rule holders named</div>
                  <div className="v" style={{ color: c.exceptions.total ? ratioColour(r2) : "var(--idle)" }}>
                    {c.exceptions.total ? `${r2}%` : "—"}
                    <small>
                      {c.exceptions.withRuleHolder}/{c.exceptions.total}
                    </small>
                  </div>
                  <div className="d">
                    The ceiling on eval quality. An exception with no rule holder cannot
                    be adjudicated.
                  </div>
                </div>
                <div className="ratio">
                  <div className="k">Allocations reasoned</div>
                  <div className="v" style={{ color: c.allocations.total ? ratioColour(r3) : "var(--idle)" }}>
                    {c.allocations.total ? `${r3}%` : "—"}
                    <small>
                      {c.allocations.withReason}/{c.allocations.total}
                    </small>
                  </div>
                  <div className="d">
                    The reason is the artefact. At G2 the grid must <b>survive challenge</b>.
                  </div>
                </div>
                <div className="ratio">
                  <div className="k">Ontology coverage</div>
                  <div className="v" style={{ color: c.competencyQuestions.total ? ratioColour(r4) : "var(--idle)" }}>
                    {c.competencyQuestions.total ? `${r4}%` : "—"}
                    <small>
                      {c.competencyQuestions.answerable}/{c.competencyQuestions.total}
                    </small>
                  </div>
                  <div className="d">
                    Answerable means <b>run and verified</b> — not that the entities exist.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== audit findings ===== */}
        <section className="sec">
          <div className="sec-h">
            <h2>Chain audit</h2>
            <div className="note">
              Each finding carries a location. A count with no location is not actionable.
            </div>
          </div>
          <div className="card">
            {c.audit.findings.length ? (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Kind</th>
                      <th>Id</th>
                      <th>Where</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.audit.findings.map((f, i) => (
                      <tr key={`${f.kind}-${f.id}-${i}`}>
                        <td>
                          <span
                            className={`pill ${
                              f.kind === "dangling-citation" || f.kind === "unsourced-requirement"
                                ? "fail"
                                : "caveat"
                            }`}
                          >
                            {f.kind.replace(/-/g, " ")}
                          </span>
                        </td>
                        <td>
                          <code>{f.id}</code>
                        </td>
                        <td>
                          <code>{f.location}</code>
                        </td>
                        <td>{f.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                No broken links. Every artefact traces to evidence.
              </div>
            )}
            <div className="legend">
              <span>
                <i style={{ background: "var(--fail)" }} />
                blocking — unsourced requirements and dangling citations stop modelling
              </span>
              <span>
                <i style={{ background: "var(--caveat)" }} />
                other findings
              </span>
            </div>
          </div>
        </section>

        {/* ===== instruments ===== */}
        <section className="sec">
          <div className="sec-h">
            <h2>Instruments</h2>
            <div className="note">
              Coverage is not readiness. An engagement can have full instruments and still
              fail G1.
            </div>
          </div>
          <div className="card">
            <div>
              {e.instruments.map((i) => (
                <div className="irow" key={i.id}>
                  <div className="nm">
                    <b>{i.label}</b> <em>{i.stage}</em>
                  </div>
                  <div className="meter">
                    <i
                      style={{
                        width: `${pct(i.rows, maxRows)}%`,
                        background: STATUS_VAR[i.status] ?? "var(--idle)",
                      }}
                    />
                  </div>
                  <div className="ct">{i.rows}</div>
                  <div className="st">
                    <span className={`pill ${STATUS_PILL[i.status] ?? "idle"}`}>{i.status}</span>
                  </div>
                  <div className="up">{i.updated ?? "—"}</div>
                </div>
              ))}
            </div>
            <div className="legend">
              <span>
                <i style={{ background: "var(--pass)" }} />
                populated — 5+ rows
              </span>
              <span>
                <i style={{ background: "var(--caveat)" }} />
                thin — 1 to 4
              </span>
              <span>
                <i style={{ background: "var(--idle)" }} />
                empty — 0
              </span>
              <span style={{ marginLeft: "auto" }}>
                Counts come from <b>&nbsp;role=register</b> tables only.
              </span>
            </div>
          </div>
        </section>

        {/* ===== gate detail ===== */}
        {openGate && (
          <section className="sec">
            <div className="sec-h">
              <h2>
                {openGate.id} — {openGate.label}
              </h2>
              <div className="note">
                A gate is a stop, not a status update. The memo recommends; the operator
                decides.
              </div>
            </div>
            <div className="card">
              <div className="card-h">
                <h3>Criteria</h3>
                <div className="r">{GATE_LABEL[openGate.status] ?? openGate.status}</div>
              </div>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Criterion</th>
                      <th>Status</th>
                      <th>Evidence</th>
                      <th>To close</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openGate.criteria.map((x, i) => (
                      <tr key={i}>
                        <td>
                          <b>{x.name}</b>
                        </td>
                        <td>
                          <span className={`pill ${STATUS_PILL[x.status] ?? "idle"}`}>
                            {x.status || "unmet"}
                          </span>
                        </td>
                        <td>{x.evidence ? <code>{x.evidence}</code> : "—"}</td>
                        <td>{x.toClose || "—"}</td>
                        <td>{x.owner || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {openGate.behaviours.length > 0 && (
                <>
                  <div className="card-h" style={{ borderTop: "1px solid var(--line-soft)" }}>
                    <h3>Behaviours</h3>
                    <div className="r">artefacts alone do not pass this gate</div>
                  </div>
                  <div className="scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Behaviour</th>
                          <th>Observed</th>
                          <th>Where</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openGate.behaviours.map((b, i) => (
                          <tr key={i}>
                            <td>{b.name}</td>
                            <td>
                              <span className={`pill ${b.observed ? "pass" : "idle"}`}>
                                {b.observed ? "yes" : "not yet"}
                              </span>
                            </td>
                            <td>{b.where || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ===== questions + raid ===== */}
        <section className="sec">
          <div className="sec-h">
            <h2>Questions and RAID</h2>
            <div className="note">
              Ranked by what is blocked, not by curiosity. Age computed at read time.
            </div>
          </div>
          <div className="grid g2">
            <div className="card">
              <div className="card-h">
                <h3>Open questions</h3>
                <div className="r">{e.openQuestions.length} unanswered</div>
              </div>
              {e.openQuestions.length ? (
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Id</th>
                        <th>Question</th>
                        <th>Blocks</th>
                        <th className="n">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...e.openQuestions]
                        .map((q) => ({ q, age: ageDays(cell(q, "Raised")) }))
                        .sort((a, b) => (b.age ?? -1) - (a.age ?? -1))
                        .map(({ q, age }, i) => (
                          <tr key={i}>
                            <td>
                              <code>{cell(q, "Id")}</code>
                            </td>
                            <td>
                              <b>{cell(q, "Question")}</b>
                              <br />
                              <span style={{ color: "var(--ink-3)", fontSize: "11.5px" }}>
                                {cell(q, "Why it matters")}
                              </span>
                            </td>
                            <td>
                              {cell(q, "Blocks")}
                              <br />
                              <span style={{ color: "var(--ink-3)", fontSize: "11.5px" }}>
                                {cell(q, "Who can answer")}
                              </span>
                            </td>
                            <td className="n">
                              <span className={`age ${ageClass(age)}`}>
                                {age === null ? "—" : `${age}d`}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No open questions.</div>
              )}
            </div>

            <div className="card">
              <div className="card-h">
                <h3>RAID</h3>
                <div className="r">{e.raid.length} entries</div>
              </div>
              {e.raid.length ? (
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Owner</th>
                        <th>Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.raid.map((r, i) => {
                        const owner = cell(r, "Owner");
                        const review = cell(r, "Review");
                        const untracked = !owner || !review;
                        return (
                          <tr key={i}>
                            <td>{cell(r, "Risk", "Assumption", "Issue", "Dependency", "Item")}</td>
                            <td>{owner || "—"}</td>
                            <td>
                              {untracked ? (
                                <span className="pill fail">untracked</span>
                              ) : (
                                review
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">RAID log empty.</div>
              )}
              <div className="legend">
                <span>
                  An entry with no owner or no review date is not tracked — it renders as a
                  defect, deliberately.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== autonomy ===== */}
        <section className="sec">
          <div className="sec-h">
            <h2>Autonomy</h2>
            <div className="note">A rung is a measurement, not a phase name.</div>
          </div>
          <div className="card">
            {e.autonomy.length ? (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Workflow</th>
                      <th>Rung</th>
                      <th className="n">Agreement</th>
                      <th className="n">Sample</th>
                      <th>Disagreement</th>
                      <th>Understood</th>
                      <th>Decided by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.autonomy.map((a, i) => {
                      const measured = a["agreement"] !== null && a["agreement"] !== undefined;
                      const pattern = a["disagreementPattern"] as string | null;
                      return (
                        <tr key={i}>
                          <td>
                            <b>{String(a["workflow"] ?? "—")}</b>
                          </td>
                          <td>
                            <span className={`pill ${measured ? "active" : "fail"}`}>
                              {String(a["rung"] ?? "—")}
                            </span>
                          </td>
                          <td className="n">
                            {measured ? (
                              <b>{String(a["agreement"])}</b>
                            ) : (
                              <span className="pill fail">asserted, not measured</span>
                            )}
                          </td>
                          <td className="n">{String(a["sample"] ?? "—")}</td>
                          <td>
                            {pattern ? (
                              <span className={`pill ${pattern === "clustered" ? "caveat" : "fail"}`}>
                                {pattern}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span className={`pill ${a["understood"] ? "pass" : "idle"}`}>
                              {a["understood"] ? "yes" : "no"}
                            </span>
                          </td>
                          <td>{String(a["decidedBy"] ?? "—")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No workflows measured. Nothing has earned a rung.</div>
            )}
            <div className="legend">
              <span>
                Clustered divergence is a fixable gap — usually a rule already in the
                exception register. Scattered is a capability ceiling. They look identical
                in a summary metric.
              </span>
            </div>
          </div>
        </section>

        {/* ===== ops ===== */}
        <section className="sec">
          <div className="sec-h">
            <h2>Deliverables and ops</h2>
            <div className="note">
              Nothing is a client deliverable until it has been rendered.
            </div>
          </div>
          <div className="ops" style={{ marginBottom: 16 }}>
            <div className="op">
              <div className="k">Rendered</div>
              <div className="v">{e.deliverables.filter((d) => d.rendered).length}</div>
              <div className="d">Client-facing artefacts in deliverables/.</div>
            </div>
            <div className="op">
              <div className="k">Datasources</div>
              <div className="v">{e.datasources.length}</div>
              <div className="d">
                {e.datasources.length
                  ? `${bytes(e.datasources.reduce((n, d) => n + d.sizeBytes, 0))} total. Read-only to the harness.`
                  : "None received."}
              </div>
            </div>
            <div className="op">
              <div className="k">Run events</div>
              <div className="v">{e.runEvents.count}</div>
              <div className="d">
                Machine-readable agent runs — what lets state derive without an
                interactive session.
              </div>
            </div>
            <div className="op">
              <div className="k">Pending prompt edits</div>
              <div
                className="v"
                style={{ color: e.harnessImprover.pendingPromptEdits ? "var(--caveat)" : "var(--ink)" }}
              >
                {e.harnessImprover.pendingPromptEdits}
              </div>
              <div className="d">
                Held in feedback for deliberate promotion.{" "}
                <b>harness-improver never edits an agent prompt.</b>
              </div>
            </div>
          </div>

          {e.friction.length > 0 && (
            <div className="card">
              <div className="card-h">
                <h3>Friction cited in recent sessions</h3>
              </div>
              <div className="card-b">
                {e.friction.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: "var(--ink-2)",
                      marginBottom: 10,
                      paddingLeft: 11,
                      borderLeft: "2px solid var(--line)",
                    }}
                  >
                    {f.note}
                    <br />
                    <span style={{ color: "var(--ink-3)", fontSize: 11 }}>{f.session}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {e.sessions.latestSummary && (
          <section className="sec">
            <div className="card">
              <div className="card-h">
                <h3>Last session</h3>
                <div className="r">
                  <code>{e.sessions.latest}</code> · {e.sessions.latestDate}
                </div>
              </div>
              <div className="card-b">
                <p style={{ margin: 0, maxWidth: "80ch", fontSize: 13.5 }}>
                  {e.sessions.latestSummary}
                </p>
              </div>
            </div>
          </section>
        )}
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}
