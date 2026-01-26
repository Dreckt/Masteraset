export const runtime = "edge";

async function getSets() {
  const res = await fetch("https://masteraset.com/api/pokemon/sets", { cache: "no-store" });
  return res.json();
}

async function getCards(setId: string) {
  const res = await fetch(
    `https://masteraset.com/api/pokemon/cards?setId=${encodeURIComponent(setId)}&pageSize=60`,
    { cache: "no-store" }
  );
  return res.json();
}

export default async function PokemonSetPage({ params }: { params: { setId: string } }) {
  const setId = params.setId;

  const setsJson: any = await getSets();
  const set = (setsJson?.data ?? []).find((s: any) => s.id === setId);

  const cardsJson: any = await getCards(setId);
  const cards = cardsJson?.data ?? [];

  return (
    <div className="page">
      <a href="/pokemon/sets" style={{ opacity: 0.8 }}>← Back to Sets</a>

      <h1 className="brand-title" style={{ marginTop: 10 }}>
        {set?.name ?? setId} <span className="brand-a">Cards</span>
      </h1>

      <p style={{ opacity: 0.8 }}>
        {set?.series ? `${set.series} • ` : ""}{set?.releaseDate ?? ""}
      </p>

      <div className="grid" style={{ marginTop: 18 }}>
        {cards.map((c: any) => (
          <div key={c.id} className="tile">
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              #{c.number} • {c.rarity ?? "—"}
            </div>

            {c.images?.small ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.images.small}
                alt={c.name}
                style={{ width: "100%", marginTop: 10, borderRadius: 12 }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <p style={{ marginTop: 18, fontSize: 13, opacity: 0.7 }}>
        Showing first 60 cards.
      </p>
    </div>
  );
}
