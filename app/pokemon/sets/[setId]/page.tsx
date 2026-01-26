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

async function getSet(setId: string): Promise<PokemonSet | null> {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const res = await fetch(`${origin}/api/pokemon/sets/${setId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load set ${setId}: ${res.status}`);
  const json = (await res.json()) as { data?: PokemonSet };
  return json?.data ?? null;
}

export default async function PokemonSetPage({
  params,
}: {
  params: { setId: string };
}) {
  const set = await getSet(params.setId);

  if (!set) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Set not found</h1>
        <p>
          No Pokémon set found for id: <code>{params.setId}</code>
        </p>
        <p>
          <a href="/pokemon/sets">Back to sets</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <p>
        <a href="/pokemon/sets">← Back to sets</a>
      </p>
      <h1>{set.name}</h1>

      <div style={{ marginTop: 12, opacity: 0.85 }}>
        <div>
          <strong>ID:</strong> {set.id}
        </div>
        {set.series && (
          <div>
            <strong>Series:</strong> {set.series}
          </div>
        )}
        {set.releaseDate && (
          <div>
            <strong>Release:</strong> {set.releaseDate}
          </div>
        )}
        {typeof set.printedTotal === "number" && (
          <div>
            <strong>Printed Total:</strong> {set.printedTotal}
          </div>
        )}
        {typeof set.total === "number" && (
          <div>
            <strong>Total Cards:</strong> {set.total}
          </div>
        )}
      </div>

      {(set.images?.logo || set.images?.symbol) && (
        <div style={{ marginTop: 16, display: "flex", gap: 16, alignItems: "center" }}>
          {set.images?.symbol && (
            <img src={set.images.symbol} alt="Set symbol" style={{ height: 64 }} />
          )}
          {set.images?.logo && (
            <img src={set.images.logo} alt="Set logo" style={{ height: 64 }} />
          )}
        </div>
      )}
    </main>
  );
}

