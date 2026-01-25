import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MasteraSet",
  description: "Track trading card sets across games and languages."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", margin: 0 }}>
        <div style={{ borderBottom: "1px solid #eee", padding: "12px 16px", display: "flex", gap: 14, alignItems: "center" }}>
          <a href="/" style={{ textDecoration: "none", fontWeight: 700, color: "#111" }}>MasteraSet</a>
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
