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
