export const runtime = "edge";

async function getSets() {
  const res = await fetch("https://masteraset.com/api/pokemon/sets", {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load sets: ${res.status} ${text}`);
  }

  return res.json();
}

export default async function PokemonSetsPage() {
  const json: any = await getSets();
  const sets = (json?.data ?? []) as any[];


  return (
    <div className="page">
      <h1 className="brand-title">
        Pokémon <span className="brand-a">Sets</span>
      </h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Pulling live from the Pokémon TCG API.
      </p>

      <div className="grid" style={{ marginTop: 18 }}>
        {sets.slice(0, 60).map((s: any) => (
          <div key={s.id} className="tile">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {s.images?.symbol ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.images.symbol}
                  alt=""
                  width={34}
                  height={34}
                  style={{ borderRadius: 8, opacity: 0.95 }}
                />
              ) : null}
              <div>
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  {s.series} • {s.releaseDate}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 18, fontSize: 13, opacity: 0.7 }}>
        Showing first 60 sets for now.
      </p>
    </div>
  );
}
