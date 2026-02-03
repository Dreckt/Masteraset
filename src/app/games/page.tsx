// src/app/games/page.tsx

export const dynamic = "force-static";
export const revalidate = 3600;

import Link from "next/link";

export default function GamesPage() {
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
              Browse by source. Pokémon uses the public TCG API. Database games
              will come from your D1 library.
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

          <div className="ms-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Database Games</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              This section will list games from your D1 tables (the ones that
              currently produce UUID URLs like /games/&lt;id&gt;/sets).
            </div>
            <div className="ms-muted" style={{ marginTop: 12 }}>
              For now: use <span className="ms-accent-cyan">Admin Import</span>{" "}
              to add data, or navigate directly if you know the URL.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
