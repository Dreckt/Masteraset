export default function HomePage() {
  return (
    <div className="ms-container">
      <div
        className="ms-panel"
        style={{ padding: 26, position: "relative", overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute",
            inset: -200,
            background:
              "radial-gradient(600px 300px at 20% 10%, rgba(0,240,255,0.22), transparent 60%)," +
              "radial-gradient(600px 300px at 85% 0%, rgba(255,61,129,0.18), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div className="ms-chip" style={{ marginBottom: 14 }}>
            <span className="ms-accent-cyan" style={{ fontWeight: 800 }}>
              MasteraSet
            </span>
            <span className="ms-muted">Your collection vault</span>
          </div>

          <div className="ms-h1" style={{ marginBottom: 10 }}>
            Track. <span className="ms-accent-cyan">Value.</span>{" "}
            <span className="ms-accent-pink">Grow.</span>
          </div>

          <div className="ms-muted" style={{ fontSize: 16, maxWidth: 780 }}>
            Track sets and your collection across Weiss Schwarz, Pokémon, MTG, Lorcana,
            One Piece — with room to add more.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <a className="ms-btn ms-btn-primary" href="/games">
              Browse Games & Sets
            </a>
            <a className="ms-btn ms-btn-pink" href="/dashboard">
              Open Dashboard
            </a>
            <a className="ms-btn" href="/collection">
              My Collection
            </a>
          </div>

          <div className="ms-divider" style={{ marginTop: 18, marginBottom: 18 }} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <a className="ms-card" href="/games" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800 }}>Games</div>
              <div className="ms-muted" style={{ marginTop: 6 }}>
                Pokémon, Weiss, One Piece, Lorcana, MTG
              </div>
              <div className="ms-muted" style={{ marginTop: 10 }}>
                <span className="ms-accent-cyan">→</span> Open
              </div>
            </a>

            <a className="ms-card" href="/collection" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800 }}>Collection</div>
              <div className="ms-muted" style={{ marginTop: 6 }}>
                Your owned cards, progress, notes
              </div>
              <div className="ms-muted" style={{ marginTop: 10 }}>
                <span className="ms-accent-cyan">→</span> Open
              </div>
            </a>

            <a className="ms-card" href="/dashboard" style={{ padding: 16 }}>
              <div style={{ fontWeight: 800 }}>
                Dashboard <span className="ms-accent-pink">Vault</span>
              </div>
              <div className="ms-muted" style={{ marginTop: 6 }}>
                Value + completion + recent adds
              </div>
              <div className="ms-muted" style={{ marginTop: 10 }}>
                <span className="ms-accent-pink">→</span> Open
              </div>
            </a>
          </div>

          <div className="ms-muted" style={{ marginTop: 14, fontSize: 13 }}>
            Note: Login is wired, but sending the magic link email requires adding an email
            provider key (template included).
          </div>
        </div>
      </div>
    </div>
  );
}
