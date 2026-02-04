export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";

type SetRow = {
  id: string;
  name: string;
  code: string | null;
  release_date: string | null;
  total_cards: number | null;
};

export default async function GameSetsPage({
  params,
}: {
  params: { game: string };
}) {
  const gameId = params.game;

  const { env } = getRequestContext();
  const db = (env as any).DB;

  const gameRes = await db
    .prepare("SELECT id, name FROM games WHERE id = ?")
    .bind(gameId)
    .first();

  if (!gameRes) {
    return (
      <div className="ms-container">
        <div className="ms-panel" style={{ padding: 22 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Game not found</div>
          <div className="ms-muted" style={{ marginTop: 8 }}>
            No game exists with id: {gameId}
          </div>
          <div style={{ marginTop: 14 }}>
            <a className="ms-btn ms-btn-primary" href="/games">
              Back to Games
            </a>
          </div>
        </div>
      </div>
    );
  }

  const setsRes = await db
    .prepare(
      "SELECT id, name, code, release_date, total_cards FROM sets WHERE game_id = ? ORDER BY release_date DESC, name ASC"
    )
    .bind(gameId)
    .all();

  const sets = (setsRes?.results ?? []) as SetRow[];

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
              {gameRes.name} <span className="ms-accent-cyan">Sets</span>
            </div>
            <div className="ms-muted" style={{ marginTop: 6 }}>
              Loaded from D1 (no external APIs).
            </div>
          </div>

          <a className="ms-btn" href="/games">
            Back
          </a>
        </div>

        <div className="ms-divider" style={{ marginTop: 16, marginBottom: 16 }} />

        {sets.length === 0 ? (
          <div className="ms-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800 }}>No sets yet</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Import sets via the admin CSV import tool (we’ll add next).
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
            {sets.map((s) => (
              <div key={s.id} className="ms-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 900 }}>{s.name}</div>
                <div className="ms-muted" style={{ marginTop: 6 }}>
                  {s.code ? `Code: ${s.code}` : "Code: —"} •{" "}
                  {s.release_date ? `Release: ${s.release_date}` : "Release: —"} •{" "}
                  {typeof s.total_cards === "number"
                    ? `${s.total_cards} cards`
                    : "Cards: —"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
