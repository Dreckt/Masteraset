import { headers } from "next/headers";
import Link from "next/link";

export const runtime = "edge";

type PokemonCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  types?: string[];
  hp?: string;
  set?: {
    id?: string;
    name?: string;
    series?: string;
    releaseDate?: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
};

function getOriginFromHeaders(): string {
  const h = headers();

  // Cloudflare + browsers
  const xfProto = h.get("x-forwarded-proto");
  const host = h.get("host");

  if (host) {
    const proto = xfProto || "https";
    return `${proto}://${host}`;
  }

  // Fallback (shouldn’t happen often)
  return "https://masteraset.com";
}

export default async function PokemonCardPage({
  params,
}: {
  params: { cardId: string };
}) {
  const cardId = params.cardId;
  const origin = getOriginFromHeaders();

  // IMPORTANT: do NOT pass fetch({ cache: ... }) on Cloudflare Workers (not implemented)
  const res = await fetch(
    `${origin}/api/pokemon/cards/${encodeURIComponent(cardId)}`
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch card ${cardId}. Status: ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as { data?: PokemonCard };
  const card = json.data;

  if (!card) {
    throw new Error(`No data returned for card: ${cardId}`);
  }

  return (
    <main className="ms-container" style={{ paddingTop: 18, paddingBottom: 40 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/pokemon" className="ms-link">
          Pokémon
        </Link>
        <span style={{ opacity: 0.5 }}>›</span>
        <Link href="/pokemon/sets" className="ms-link">
          Sets
        </Link>
        {card.set?.id ? (
          <>
            <span style={{ opacity: 0.5 }}>›</span>
            <Link href={`/pokemon/sets/${card.set.id}`} className="ms-link">
              {card.set?.name ?? card.set.id}
            </Link>
          </>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "minmax(240px, 360px) 1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div
          className="ms-panel"
          style={{
            padding: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {card.images?.large || card.images?.small ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.images.large ?? card.images.small}
              alt={card.name}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 10,
                display: "block",
              }}
            />
          ) : (
            <div style={{ opacity: 0.7 }}>No image available.</div>
          )}
        </div>

        <div
          style={{
            padding: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>
            {card.name}
          </h1>

          <div style={{ marginTop: 10, opacity: 0.85, display: "grid", gap: 6 }}>
            <div>
              <strong>ID:</strong> {card.id}
            </div>

            {card.set?.name ? (
              <div>
                <strong>Set:</strong> {card.set.name}
                {card.number ? ` • #${card.number}` : ""}
              </div>
            ) : null}

            {card.rarity ? (
              <div>
                <strong>Rarity:</strong> {card.rarity}
              </div>
            ) : null}

            {card.supertype ? (
              <div>
                <strong>Type:</strong> {card.supertype}
                {card.subtypes?.length ? ` (${card.subtypes.join(", ")})` : ""}
              </div>
            ) : null}

            {card.types?.length ? (
              <div>
                <strong>Elements:</strong> {card.types.join(", ")}
              </div>
            ) : null}

            {card.hp ? (
              <div>
                <strong>HP:</strong> {card.hp}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
