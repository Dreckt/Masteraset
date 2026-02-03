// src/app/games/page.tsx

export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";

type GameRow = {
  id: string;
  name: string;
};

export default async function GamesPage() {
  // Pull games from D1 (your existing “Games Library”)
  let games: GameRow[] = [];
  try {
    games = await db
      .prepare(`SELECT id, name FROM games ORDER BY name ASC`)
      .all()
      .then((r: any) => (r?.results ?? []) as GameRow[]);
  } catch {
    games = [];
  }

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
          <Link className="ms-btn ms-btn-primary" href="/dashboard">
            Dashboard
          </Link>
        </div>

        <div className="ms-divider" style={{ marginTop: 16, marginBottom: 16 }} />

        {/* IMPORTANT: Add an explicit Pokémon (API) card so Base1 is reachable */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <Link className="ms-card" href="/pokemon/sets" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>Pokémon</div>
              <span className="ms-chip">
                <span className="ms-accent-cyan">●</span>{" "}
                <span className="ms-muted">TCG API</span>
              </span>
            </div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Browse Pokémon sets (Base1, Jungle, Fossil, etc.)
            </div>
            <div className="ms-muted" style={{ marginTop: 12 }}>
              <span className="ms-accent-cyan">→</span> Go to /pokemon/sets
            </div>
          </Link>

          {/* Your existing DB-driven games list */}
          {games.map((g) => (
            <Link
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
                  <span className="ms-accent-cyan">●</span>{" "}
                  <span className="ms-muted">Sets</span>
                </span>
              </div>
              <div className="ms-muted" style={{ marginTop: 8 }}>
                Browse sets stored in your MasteraSet database.
              </div>
              <div className="ms-muted" style={{ marginTop: 12 }}>
                <span className="ms-accent-cyan">→</span> Browse sets
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
