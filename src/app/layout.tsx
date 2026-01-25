import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Master A Set",
  description: "Track trading card sets across games and languages."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="logo">
            Master <span>A</span> Set
          </a>

          <nav style={{ display: "flex", gap: 24 }}>
            <a href="/games">Games</a>
            <a href="/me">My Collection</a>
            <a href="/login">Login</a>
          </nav>
        </header>

        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Master a Set",
  description: "Track trading card sets across games and languages."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", margin: 0 }}>
        <div style={{ borderBottom: "1px solid #eee", padding: "12px 16px", display: "flex", gap: 14, alignItems: "center" }}>
          <a href="/" style={{ textDecoration: "none", fontWeight: 700, color: "#111" }}>Master a Set</a>
          <a href="/games" style={{ textDecoration: "none", color: "#111" }}>Games</a>
          <a href="/me" style={{ textDecoration: "none", color: "#111" }}>My Collection</a>
          <div style={{ marginLeft: "auto" }} />
          <a href="/login" style={{ textDecoration: "none", color: "#111" }}>Login</a>
        </div>
        <main style={{ padding: "16px" }}>{children}</main>
      </body>
    </html>
  );
}
