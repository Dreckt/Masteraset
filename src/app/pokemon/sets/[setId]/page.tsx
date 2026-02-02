import Link from "next/link";

export const runtime = "edge";

type PokemonTCGSet = {
  id: string;
  name: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string;
  images?: any;
};

type PokemonTCGCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  images?: any;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "Cache-Control": "no-store" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status} for ${url}: ${text.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

export default async function PokemonSetPage({
  params,
}: {
  params: { setId: string };
}) {
  const setId = params?.setId;

  if (!setId) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Set not found</h1>
        <Link href="/pokemon/sets">Back to sets</Link>
      </main>
    );
  }

  // Build absolute origin for Edge
  const origin =
    (typeof headers === "function" && (await import("next/headers")).headers().get("x-forwarded-host"))
      ? `https://${(await import("next/headers")).headers().get("x-forwarded-host")}`
      : "";

  const setUrl = `${origin}/api/pokemon/sets/${encodeURIComponent(setId)}`;
  const cardsUrl = `${origin}/api/pokemon/cards?setId=${encodeURIComponent(setId)}`;

  let setData: { data?: PokemonTCGSet };
  let cardsData: { data?: PokemonTCGCard[] };

  try {
    setData = await fetchJson<{ data?: PokemonTCGSet }>(setUrl);
  } catch (e: any) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Error loading set</h1>
        <p>{String(e?.message || e)}</p>
        <Link href="/pokemon/sets">Back to sets</Link>
      </main>
    );
  }

  try {
    cardsData = await fetchJson<{ data?: PokemonTCGCard[] }>(cardsUrl);
  } catch {
    cardsData = { data: [] };
  }

  const set = setData?.data;
  const cards = cardsData?.data ?? [];

  if (!set) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Set not found</h1>
        <Link href="/pokemon/sets">Back to sets</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>{set.name}</h1>
      <p>{set.total} cards</p>

      <Link href="/pokemon/sets">← Back</Link>

      <ul>
        {cards.map((c) => (
          <li key={c.id}>
            <Link href={`/pokemon/cards/${c.id}`}>{c.name}</Link> ({c.number})
          </li>
        ))}
      </ul>
    </main>
  );
}
