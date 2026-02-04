// src/app/games/page.tsx

export const dynamic = "force-static";
export const revalidate = 3600;

import Link from "next/link";
import { getEnv } from "@/lib/cloudflare";

export const runtime = "edge";

export default async function GamesPage() {
  // We fetch DB games, but we NEVER rely on them for the core tiles.
  let dbGames: Array<{ id: string; slug: string; name: string }> = [];

  try {
    const env = getEnv();
    const { results } = await env.DB.prepare(
      "SELECT id, slug, name FROM games ORDER BY name ASC"
    ).all();
    dbGames = (results ?? []) as any;
  } catch {
    // If running in a context where D1 isn't available, we still render core tiles.
    dbGames = [];
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
              Core games are always available. Database games appear after you import them.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="ms-btn ms-btn-primary" href="/pokemon/sets">
              Pokémon Sets
            </Link>
            <Link className="ms-btn" href="/dashboard">
              Dashboard
            </Link>
            <Link className="ms-btn" href="/admin/import">
              Admin Import
            </Link>
          </div>
        </div>

        <div className="ms-divider" style={{ marginTop: 16, marginBottom: 16 }} />

        {/* Core Games: never disappears */}
        <div className="ms-h3" style={{ marginBottom: 10 }}>
          Core <span className="ms-accent-cyan">Games</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <Link className="ms-card" href="/pokemon/sets" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Pokémon</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Browse Pokémon sets (Base Set, Jungle, Fossil, etc.)
            </div>
            <div className="ms-muted" style={{ marginTop: 12 }}>
              <span className="ms-accent-cyan">→</span> Go to /pokemon/sets
            </div>
          </Link>

          <Link className="ms-card" href="/games/one-piece" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>One Piece</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Browse One Piece sets from your library (once imported).
            </div>
            <div className="ms-muted" style={{ marginTop: 12 }}>
              <span className="ms-accent-cyan">→</span> Go to /games/one-piece
            </div>
          </Link>

          <Link className="ms-card" href="/games/lorcana" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Lorcana</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Browse Disney Lorcana sets from your library (once imported).
            </div>
            <div className="ms-muted" style={{ marginTop: 12 }}>
              <span className="ms-accent-cyan">→</span> Go to /games/lorcana
            </div>
          </Link>

          <Link className="ms-card" href="/games/weiss-schwarz" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Weiss Schwarz</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Browse Weiss Schwarz sets from your library (once imported).
            </div>
            <div className="ms-muted" style={{ marginTop: 12 }}>
              <span className="ms-accent-cyan">→</span> Go to /games/weiss-schwarz
            </div>
          </Link>
        </div>

        <div className="ms-divider" style={{ marginTop: 18, marginBottom: 16 }} />

        {/* Database Games: shows when you have rows */}
        <div className="ms-h3" style={{ marginBottom: 10 }}>
          Database <span className="ms-accent-cyan">Games</span>
        </div>

        {dbGames.length === 0 ? (
          <div className="ms-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>No database games yet</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Your D1 <span className="ms-accent-cyan">games</span> table is empty right now.
              Use <span className="ms-accent-cyan">Admin Import</span> to add games/sets, and they’ll appear here automatically.
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
            {dbGames.map((g) => (
              <Link
                key={g.id}
                className="ms-card"
                href={`/games/${g.slug}`}
                style={{ padding: 16 }}
              >
                <div style={{ fontWeight: 900, fontSize: 18 }}>{g.name}</div>
                <div className="ms-muted" style={{ marginTop: 8 }}>
                  Stored in your D1 library
                </div>
                <div className="ms-muted" style={{ marginTop: 12 }}>
                  <span className="ms-accent-cyan">→</span> Go to /games/{g.slug}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
