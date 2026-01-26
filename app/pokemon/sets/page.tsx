export const runtime = "edge";

import { headers } from "next/headers";

type PokemonSet = {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
};

async function getSets(): Promise<PokemonSet[]> {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const res = await fetch(`${origin}/api/pokemon/sets`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load sets: ${res.status}`);
  const json = (await res.json()) as { data?: PokemonSet[] };
  return json?.data ?? [];
}

export default async function PokemonSetsPage() {
  const sets = await getSets();

  return (
    <main style={{ padding: 24 }}>
      <h1>Pokémon Sets</h1>
      <p style={{ opacity: 0.8 }}>Loaded {sets.length} sets.</p>

      <ul style={{ marginTop: 16, lineHeight: 1.8 }}>
        {sets.map((s) => (
          <li key={s.id}>
            <a href={`/pokemon/sets/${s.id}`}>
              <strong>{s.name}</strong>
            </a>{" "}
            <span style={{ opacity: 0.75 }}>
              ({s.id}
              {s.series ? ` • ${s.series}` : ""}
              {s.releaseDate ? ` • ${s.releaseDate}` : ""})
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
