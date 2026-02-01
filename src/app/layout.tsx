import "./globals.css";

export const metadata = {
  title: "MasteraSet",
  description: "Track. Value. Grow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(11,14,20,0.65)",
            backdropFilter: "blur(10px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            className="ms-container"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 14,
              paddingBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>
                Mastera<span className="ms-accent-cyan">Set</span>
              </div>
              <span className="ms-chip">Local Dev</span>
            </div>

            <nav style={{ display: "flex", gap: 16, color: "var(--ms-muted)" }}>
              <a href="/">Home</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/games">Sets</a>
              <a href="/pokemon">Pokémon</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}

