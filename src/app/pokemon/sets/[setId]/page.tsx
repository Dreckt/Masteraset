import Link from "next/link";

export const runtime = "edge";

type PokemonTCGSet = {
  id: string;
  name: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string;
  images?: {
    symbol?: string;
    logo?: string;
  };
};

type PokemonTCGCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  images?: {
    small?: string;
    large?: string;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    // ✅ Cloudflare-safe: do NOT use fetch({ cache: ... })
    headers: {
      "Cache-Control": "no-store",
    },
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
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Set not found</h1>
        <p>Missing set id.</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
      </main>
    );
  }

  // These are your internal API routes (Cloudflare-safe; you already set no-store headers there).
  const setUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/pokemon/sets/${encodeURIComponent(setId)}`;
  const cardsUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/pokemon/cards?setId=${encodeURIComponent(setId)}`;

  // If NEXT_PUBLIC_BASE_URL is not set in prod, relative URLs are safest.
  const finalSetUrl = setUrl.startsWith("/api") || setUrl.startsWith("http") ? setUrl : `/api/pokemon/sets/${encodeURIComponent(setId)}`;
  const finalCardsUrl =
    cardsUrl.startsWith("/api") || cardsUrl.startsWith("http")
      ? cardsUrl
      : `/api/pokemon/cards?setId=${encodeURIComponent(setId)}`;

  let setData: { data?: PokemonTCGSet } = {};
  let cardsData: { data?: PokemonTCGCard[] } = {};

  try {
    // ✅ Cloudflare-safe fetch wrapper (no cache param)
    setData = await fetchJson<{ data?: PokemonTCGSet }>(finalSetUrl);
  } catch (e: any) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Error loading set</h1>
        <p style={{ opacity: 0.8 }}>{String(e?.message || e)}</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
      </main>
    );
  }

  try {
    cardsData = await fetchJson<{ data?: PokemonTCGCard[] }>(finalCardsUrl);
  } catch (e: any) {
    // Don’t hard-crash the whole page if cards fail — show set info at least.
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        {set.images?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={set.images.logo} alt={`${set.name} logo`} style={{ height: 56 }} />
        ) : null}

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{set.name}</h1>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            {set.series ? <span>{set.series}</span> : null}
            {set.releaseDate ? <span> · {set.releaseDate}</span> : null}
            {typeof set.total === "number" ? <span> · {set.total} cards</span> : null}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Link href="/pokemon/sets">← Back to sets</Link>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 18 }}>Cards</h2>

      {cards.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No cards returned for this set yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {cards.map((c) => (
            <li
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: 10,
              }}
            >
              {c.images?.small ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.images.small} alt={c.name} style={{ width: 56, height: "auto", borderRadius: 6 }} />
              ) : (
                <div style={{ width: 56, height: 78, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
              )}

              <div style={{ flex: 1 }}>
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
