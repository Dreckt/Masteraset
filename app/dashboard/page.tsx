export default function DashboardPage() {
  return (
    <div className="ms-container">
      <div className="ms-panel" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div className="ms-h1">
              Dashboard <span className="ms-accent-cyan">Vault</span>
            </div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Track value, completion, and what to chase next.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="ms-btn ms-btn-primary" href="/pokemon/sets">Browse Sets</a>
            <a className="ms-btn ms-btn-pink" href="/pokemon">Go to Pokémon</a>
          </div>
        </div>

        <div className="ms-divider" style={{ marginTop: 18, marginBottom: 18 }} />

        {/* Stat row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <div className="ms-card" style={{ padding: 16 }}>
            <div className="ms-muted">Total Collection Value</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>$—</div>
            <div className="ms-muted" style={{ marginTop: 6 }}>Connect pricing later</div>
          </div>

          <div className="ms-card" style={{ padding: 16 }}>
            <div className="ms-muted">Cards Logged</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>—</div>
            <div className="ms-muted" style={{ marginTop: 6 }}>From your DB</div>
          </div>

          <div className="ms-card" style={{ padding: 16 }}>
            <div className="ms-muted">Set Completion</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>—%</div>
            <div className="ms-muted" style={{ marginTop: 6 }}>Top sets & progress</div>
          </div>

          <div className="ms-card" style={{ padding: 16 }}>
            <div className="ms-muted">Chase List</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>—</div>
            <div className="ms-muted" style={{ marginTop: 6 }}>What you need next</div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        {/* Two-column content */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 }}>
          <div className="ms-card" style={{ padding: 16, minHeight: 240 }}>
            <div className="ms-h2">Recent Adds</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              This will show the last cards you added (DB query).
            </div>

            <div className="ms-divider" style={{ marginTop: 14, marginBottom: 14 }} />

            <ul className="ms-muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>—</li>
              <li>—</li>
              <li>—</li>
            </ul>
          </div>

          <div className="ms-card" style={{ padding: 16, minHeight: 240 }}>
            <div className="ms-h2">Completion Rings</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Next: show your top 3 sets with progress.
            </div>

            <div className="ms-divider" style={{ marginTop: 14, marginBottom: 14 }} />

            <div className="ms-muted">
              • Set A — —%<br />
              • Set B — —%<br />
              • Set C — —%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
