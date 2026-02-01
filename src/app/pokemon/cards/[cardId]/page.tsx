export const runtime = "edge";

import { headers } from "next/headers";
import CardZoom from "./zoom";

type PokemonCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  artist?: string;
  images?: { small?: string; large?: string };
  set?: { id: string; name: string };
  tcgplayer?: { url?: string; prices?: any; updatedAt?: string };
  cardmarket?: { url?: string; prices?: any; updatedAt?: string };
};

function getOrigin() {
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function getCard(cardId: string): Promise<PokemonCard | null> {
  const origin = getOrigin();
  const res = await fetch(`${origin}/api/pokemon/cards/${cardId}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load card ${cardId}: ${res.status}`);
  const json = (await res.json()) as { data?: PokemonCard };
  return json?.data ?? null;
}

export default async function PokemonCardPage({ params }: { params: { cardId: string } }) {
  const card = await getCard(params.cardId);

  if (!card) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Card not found</h1>
        <p>
          No Pokémon card found for id: <code>{params.cardId}</code>
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
        <a href={card.set?.id ? `/pokemon/sets/${card.set.id}` : "/pokemon/sets"}>← Back</a>
      </p>

      <h1 style={{ marginTop: 8 }}>{card.name}</h1>
      <div style={{ opacity: 0.75, marginTop: 6 }}>
        {card.number ? `#${card.number}` : ""}
        {card.rarity ? ` • ${card.rarity}` : ""}
        {card.artist ? ` • Art: ${card.artist}` : ""}
      </div>

      <div style={{ marginTop: 16, maxWidth: 520 }}>
        <CardZoom
          small={card.images?.small ?? ""}
          large={card.images?.large ?? card.images?.small ?? ""}
          alt={card.name}
        />
        <p style={{ opacity: 0.75, marginTop: 8, fontSize: 13 }}>
          Tip: click the image to zoom.
        </p>
      </div>

      {(card.tcgplayer?.url || card.cardmarket?.url) && (
        <>
          <hr style={{ margin: "24px 0" }} />
          <h2>Market Links</h2>
          <ul>
            {card.tcgplayer?.url && (
              <li>
                <a href={card.tcgplayer.url} target="_blank" rel="noreferrer">
                  TCGplayer
                </a>
              </li>
            )}
            {card.cardmarket?.url && (
              <li>
                <a href={card.cardmarket.url} target="_blank" rel="noreferrer">
                  Cardmarket
                </a>
              </li>
            )}
          </ul>
        </>
      )}
    </main>
  );
}
