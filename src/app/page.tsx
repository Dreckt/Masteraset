// src/app/page.tsx
import Link from "next/link";

export const runtime = "edge";

export default function HomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, fontWeight: 800, marginBottom: 8 }}>
        MasteraSet
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>
        Track your collection by game and set.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          href="/pokemon/sets"
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: "12px 14px",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Pokémon Sets →
        </Link>

        <Link
          href="/games"
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: "12px 14px",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Browse Games →
        </Link>
      </div>
    </main>
  );
}
