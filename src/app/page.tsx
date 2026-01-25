export default function HomePage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginTop: 8 }}>MasteraSet</h1>
      <p>Track sets and your collection across Weiss Schwarz, Pokémon, MTG, Lorcana, One Piece — with room to add more.</p>
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <a href="/games" style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, textDecoration: "none", color: "#111" }}>
          Browse Games & Sets
        </a>
        <a href="/me" style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, textDecoration: "none", color: "#111" }}>
          View My Collection
        </a>
        <a href="/admin/seed" style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, textDecoration: "none", color: "#111" }}>
          Dev: Seed Sample Data
        </a>
      </div>
      <p style={{ marginTop: 18, fontSize: 13, opacity: 0.75 }}>
        Note: Login is wired, but sending the magic link email requires adding an email provider key (template included).
      </p>
    </div>
  );
}
