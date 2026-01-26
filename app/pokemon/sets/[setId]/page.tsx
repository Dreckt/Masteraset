export const runtime = "edge";

import { headers } from "next/headers";

type PokemonSet = {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  printedTotal?: number;
  total?: number;
  images?: { symbol?: string; logo?: string };
};

type PokemonCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  images?: { small?: string; large?: string };
};

function getOrigin() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function getSet(setId: string): Promise<PokemonSet | null> {
  const origin = getOrigin();
  const res = await fetch(`${origin}/api/pokemon/sets/${setId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load set ${setId}: ${res.status}`);
  const json = (await res.json()) as { data?: PokemonSet };
  return json?.data ?? null;
}

async function getCards(setId: string, pageSize = 50): Promise<PokemonCard[]> {
  const origin = getOrigin();
  const res = await fetch(
    `${origin}/api/pokemon/cards?setId=${encodeURIComponent(setId)}&pageSize=${pageSize}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Failed to load cards for ${setId}: ${res.status}`);
  const json = (await res.json()) as { data?: PokemonCard[] };
  return json?.data ?? [];
}

export default async function PokemonSetPage({
  params,
}: {
  params: { setId: string };
}) {
  const setId = params.setId;
  const set = await getSet(setId);

  if (!set) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Set not found</h1>
        <p>No Pokémon set found for id: <code>{setId}</code></p>
        <p><a href="/pokemon/sets">Back to sets</a></p>
      </main>
    );
  }

  const cards = await getCards(setId, 50);

  return (
    <main style={{ padding: 24 }}>
      <p><a href="/pokemon/sets">← Back to sets</a></p>

      <h1>{set.name}</h1>

      <div style={{ marginTop: 12, opacity: 0.85 }}>
        <div><strong>ID:</strong> {set.id}</div>
        {set.series && <div><strong>Series:</strong> {set.series}</div>}
        {set.releaseDate && <div><strong>Release:</strong> {set.releaseDate}</div>}
        {typeof set.printedTotal === "number" && <div><strong>Printed Total:</strong> {set.printedTotal}</div>}
        {typeof set.total === "number" && <div><strong>Total Cards:</strong> {set.total}</div>}
      </div>

      {(set.images?.logo || set.images?.symbol) && (
        <div style={{ marginTop: 16, display: "flex", gap: 16, alignItems: "center" }}>
          {set.images?.symbol && <img src={set.images.symbol} alt="Set symbol" style={{ height: 64 }} />}
          {set.images?.logo && <img src={set.images.logo} alt="Set logo" style={{ height: 64 }} />}
        </div>
      )}

      <hr style={{ margin: "24px 0" }} />

      <h2>Cards (first {cards.length})</h2>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        (Next step: paging + search — right now we show the first 50 for speed.)
      </p>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {cards.map((c) => (
          <a
            key={c.id}
            href={`/pokemon/cards/${c.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              {c.images?.small && (
                <img src={c.images.small} alt={c.name} style={{ width: "100%", borderRadius: 8 }} />
              )}
              <div style={{ marginTop: 8 }}>
                <strong>{c.name}</strong>
                <div style={{ opacity: 0.75, fontSize: 13 }}>
                  {c.number ? `#${c.number}` : ""}
                  {c.rarity ? ` • ${c.rarity}` : ""}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}

