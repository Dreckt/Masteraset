export const runtime = "edge";

import CardsGrid from "./CardsGrid";
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

function getOrigin() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function getSet(setId: string): Promise<PokemonSet | null> {
  try {
    const origin = getOrigin();
    const res = await fetch(`${origin}/api/pokemon/sets/${encodeURIComponent(setId)}`, {
      cache: "no-store",
    });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: PokemonSet };
    return json?.data ?? null;
  } catch {
    return null;
  }
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
        <p>
          No Pokémon set found for id: <code>{setId}</code>
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

      <hr style={{ margin: "24px 0" }} />

      <CardsGrid setId={setId} />
    </main>
  );
}
