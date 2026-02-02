import Link from "next/link";
import { headers } from "next/headers";

export const runtime = "edge";

type CardDetail = {
  id: string;
  name: string;
  number?: string | null;
  rarity?: string | null;
  set?: { id?: string | null; name?: string | null } | null;
  year?: number | null;
  images?: { small?: string | null; large?: string | null } | null;
};

function getOriginFromHeaders() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  if (!host) return "";
  return `${proto}://${host}`;
}

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

export default async function PokemonCardPage({
  params,
}: {
  params: { cardId: string };
}) {
  const cardId = params?.cardId;

  if (!cardId) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Card not found</h1>
        <p>Missing card id.</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
      </main>
    );
  }

  const origin = getOriginFromHeaders();
  const url = `${origin}/api/pokemon/cards/${encodeURIComponent(cardId)}`;

  let payload: { data?: CardDetail; error?: string } = {};
  try {
    payload = await fetchJson<{ data?: CardDetail; error?: string }>(url);
  } catch (e: any) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Error loading card</h1>
        <p style={{ opacity: 0.85 }}>{String(e?.message || e)}</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
      </main>
    );
  }

  const card = payload?.data;

  if (!card) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Card not found</h1>
        <p style={{ opacity: 0.85 }}>{payload?.error ?? "No card data returned."}</p>
        <p>
          <Link href="/pokemon/sets">Back to sets</Link>
        </p>
      </main>
    );
  }

  const backHref =
    card.set?.id ? `/pokemon/sets/${encodeURIComponent(card.set.id)}` : "/pokemon/sets";

  return (
    <main style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Link href={backHref}>← Back</Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0" }}>{card.name}</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        {card.number ? `#${card.number}` : null}
        {card.rarity ? ` · ${card.rarity}` : null}
        {card.set?.name ? ` · ${card.set.name}` : null}
        {card.year ? ` · ${card.year}` : null}
      </div>

      {card.images?.large ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.images.large}
          alt={card.name}
          style={{ maxWidth: 420, width: "100%", borderRadius: 12 }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            height: 520,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.8,
          }}
        >
          No image stored yet
        </div>
      )}
    </main>
  );
}
