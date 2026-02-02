import Link from "next/link";
import { headers } from "next/headers";

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
    // ✅ Cloudflare-safe: do NOT pass fetch({ cache: ... })
    headers: { "Cache-Control": "no-store" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed ${res.status} for ${url}: ${text.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

function getOriginFromHeaders() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  if (!host) return "";
  return `${proto}://${host}`;
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
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Set not found</h1>
        <p>Missing set id.</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
      </main>
    );
  }

  const origin = getOriginFromHeaders();
  const setUrl = `${origin}/api/pokemon/sets/${encodeURIComponent(setId)}`;
  const cardsUrl = `${origin}/api/pokemon/cards?setId=${encodeURIComponent(setId)}`;

  let setData: { data?: PokemonTCGSet };
  let cardsData: { data?: PokemonTCGCard[] };

  try {
    setData = await fetchJson<{ data?: PokemonTCGSet }>(setUrl);
  } catch (e: any) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Error loading set</h1>
        <p style={{ opacity: 0.85 }}>{String(e?.message || e)}</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
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
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Set not found</h1>
        <p>No set data returned for: {setId}</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/pokemon/sets">← Back to sets</Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0" }}>{set.name}</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        {typeof set.total === "number" ? `${set.total} cards` : null}
        {set.releaseDate ? ` · ${set.releaseDate}` : null}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Cards</h2>

      {cards.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No cards returned for this set yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {cards.map((c) => (
            <li
              key={c.id}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  <Link href={`/pokemon/cards/${encodeURIComponent(c.id)}`}>{c.name}</Link>
                </div>
                <div style={{ opacity: 0.8, fontSize: 13 }}>
                  {c.number ? `#${c.number}` : null}
                  {c.rarity ? ` · ${c.rarity}` : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
