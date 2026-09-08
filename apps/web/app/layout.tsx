import type { Metadata } from "next";
import "./globals.css";
import { listEngagements, storeInfo } from "@/lib/store";

export const metadata: Metadata = {
  title: "FDE engagement console",
  description: "Where every HGS forward-deployed engagement stands, derived from its own files.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [engagements, info] = await Promise.all([listEngagements(), storeInfo()]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&family=Raleway:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <aside className="rail">
          <div className="brand">
            <div className="mark">
              HG<span>S</span>
            </div>
            <div className="sub">FDE engagement console</div>
          </div>

          <div>
            <div className="lbl">Engagements</div>
            <nav>
              <a href="/">
                All engagements
                <em>{engagements.length}</em>
              </a>
              {engagements.map((e) => {
                const slug = e.engagement["slug"] ?? "";
                return (
                  <a key={slug} href={`/e/${slug}`}>
                    <div>
                      {e.engagement["client"] ?? slug}
                      <span>
                        {(e.engagement["stage"] ?? "—").replace(/^\d\d-/, "")} ·{" "}
                        {e.sessions?.count ?? 0} sessions
                      </span>
                    </div>
                  </a>
                );
              })}
              {engagements.length === 0 && (
                <a href="/" style={{ color: "rgba(255,255,255,.4)" }}>
                  None yet
                </a>
              )}
            </nav>
          </div>

          <div className="foot">
            Derived from <code>state.json</code>.
            <br />
            Regenerate with <code>/dashboard</code>.
            <br />
            <br />
            Store: <code>{info.backend}</code>
          </div>
        </aside>

        <main className="page">{children}</main>

        <footer>
          <div className="wrap">
            <div>
              <b>HGS</b> · Forward deployed engineering
            </div>
            <div>Engagement console · read-only</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
