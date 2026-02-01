export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";

type GameRow = {
  id: string;
  name: string;
};

export default async function GamesPage() {
  const { env } = getRequestContext();
  const db = (env as any).DB;

  const res = await db.prepare("SELECT id, name FROM games ORDER BY name ASC").all();
  const games = (res?.results ?? []) as GameRow[];

  return (
    <div className="ms-container">
      <div className="ms-panel" style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="ms-h2">
              Games <span className="ms-accent-cyan">Library</span>
            </div>
            <div className="ms-muted" style={{ marginTop: 6 }}>
              Choose a game to browse sets and manage your collection.
            </div>
          </div>

          <a className="ms-btn ms-btn-primary" href="/dashboard">
            Dashboard
          </a>
        </div>

        <div className="ms-divider" style={{ marginTop: 16, marginBottom: 16 }} />

        {games.length === 0 ? (
          <div className="ms-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800 }}>No games found</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Seed the database with games to display them here.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {games.map((g) => (
              <a
                key={g.id}
                className="ms-card"
                href={`/games/${g.id}/sets`}
                style={{ padding: 16 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{g.name}</div>
                  <span className="ms-chip">
                    <span className="ms-accent-cyan">●</span>
                    <span className="ms-muted">Sets</span>
                  </span>
                </div>
                <div className="ms-muted" style={{ marginTop: 8 }}>
                  Browse sets stored in your MasteraSet database.
                </div>
                <div className="ms-muted" style={{ marginTop: 12 }}>
                  <span className="ms-accent-cyan">→</span> Browse sets
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
