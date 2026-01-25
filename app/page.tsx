export default function HomePage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

<h1 className="brand-title">
  Master <span className="brand-a">A</span> Set
</h1>
      <p>Track sets and your collection across Weiss Schwarz, Pokémon, MTG, Lorcana, One Piece — with room to add more.</p>

<div className="hero-actions">
  <a href="/games" className="btn primary">Browse Games &amp; Sets</a>
  <a href="/me" className="btn secondary">View My Collection</a>
  <a href="/admin/seed" className="btn ghost">Dev: Seed Sample Data</a>
</div>

      <p style={{ marginTop: 18, fontSize: 13, opacity: 0.75 }}>
        Note: Login is wired, but sending the magic link email requires adding an email provider key (template included).
      </p>
    </div>
  );
}
