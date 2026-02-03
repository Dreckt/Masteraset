// src/app/page.tsx

export const dynamic = "force-static";
export const revalidate = 3600;

export default function HomePage() {
  return (
    <main style={{ padding: 16 }}>
      <div className="ms-container">
        <div className="ms-panel" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="ms-h2">
                Mastera<span className="ms-accent-cyan">Set</span>
              </div>
              <div className="ms-muted" style={{ marginTop: 6 }}>
                Track. Value. Grow.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="ms-btn ms-btn-primary" href="/games">Browse Sets</a>
              <a className="ms-btn" href="/dashboard">Dashboard</a>
              <a className="ms-btn" href="/pokemon/sets">Pokémon Sets</a>
            </div>
          </div>

          <div className="ms-divider" style={{ marginTop: 16, marginBottom: 16 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <a className="ms-card" href="/games" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Games Library</div>
              <div className="ms-muted" style={{ marginTop: 8 }}>Choose a game and browse sets in your database.</div>
              <div className="ms-muted" style={{ marginTop: 12 }}>
                <span className="ms-accent-cyan">→</span> Go to /games
              </div>
            </a>

            <a className="ms-card" href="/pokemon/sets" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Pokémon</div>
              <div className="ms-muted" style={{ marginTop: 8 }}>Browse Pokémon sets and view cards.</div>
              <div className="ms-muted" style={{ marginTop: 12 }}>
                <span className="ms-accent-cyan">→</span> Go to /pokemon/sets
              </div>
            </a>

            <a className="ms-card" href="/admin/import" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Admin Import</div>
              <div className="ms-muted" style={{ marginTop: 8 }}>Import sets, cards, and printings into D1.</div>
              <div className="ms-muted" style={{ marginTop: 12 }}>
                <span className="ms-accent-cyan">→</span> Go to /admin/import
              </div>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
