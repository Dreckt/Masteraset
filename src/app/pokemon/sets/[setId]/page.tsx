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
  images?: any; // expected to include { small, large } for pokemontcg.io responses
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

function badge(text: string) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        opacity: 0.9,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", opacity: 0.9, marginBottom: 14 }}>
        {typeof set.total === "number" ? badge(`${set.total} cards`) : null}
        {set.releaseDate ? badge(set.releaseDate) : null}
        {set.series ? badge(set.series) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cards</h2>
        <div style={{ opacity: 0.75, fontSize: 13 }}>
          Tip: click a card for details
        </div>
      </div>

      {cards.length === 0 ? (
        <p style={{ opacity: 0.8, marginTop: 10 }}>No cards returned for this set yet.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "12px 0 0 0",
            display: "grid",
            gap: 12,
            // Responsive grid: more columns on larger screens
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            alignItems: "stretch",
          }}
        >
          {cards.map((c) => {
            const img = c?.images?.small || c?.images?.large || "";
            const href = `/pokemon/cards/${encodeURIComponent(c.id)}`;
            return (
              <li
                key={c.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  padding: 10,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <Link
                  href={href}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "2 / 3",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={c.name}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={{ opacity: 0.6, fontSize: 12, padding: 10, textAlign: "center" }}>
                        No image
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
                      {c.name}
                    </div>
                    <div style={{ opacity: 0.8, fontSize: 12, marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {c.number ? badge(`#${c.number}`) : null}
                      {c.rarity ? badge(c.rarity) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
