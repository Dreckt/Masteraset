export const runtime = "edge";

interface PokemonSetRow {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  printedTotal: number | null;
  images_symbol: string | null;
  images_logo: string | null;
}

async function getSets(): Promise<PokemonSetRow[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/pokemon/sets`, {
    cache: "no-store",
  });

  if (!res.ok) return [];

  // FIX: ensure payload isn't inferred as {}
  const payload: any = await res.json();

  const data = (payload?.data ?? []) as PokemonSetRow[];

  return Array.isArray(data) ? data : [];
}

export default async function PokemonSetsPage() {
  const sets = await getSets();

  return (
    <main className="ms-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Pokémon Sets</h1>

      {sets.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No sets found.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sets.map((s) => (
            <a
              key={s.id}
              href={`/pokemon/sets/${s.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 16, fontWeight: 650 }}>{s.name}</div>
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  {s.series} • {s.releaseDate}
                </div>
              </div>

              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {s.total ? `${s.total} cards` : ""}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}

