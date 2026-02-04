import { getEnv } from "@/lib/cloudflare";

export const runtime = "edge";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function err(message: string, status: number, extra?: any) {
  return json({ error: message, ...(extra ?? {}) }, status);
}

/**
 * UI cardId format:
 *   pokemon-base1-72-devolution-spray
 * Derive:
 *   setId = base1
 *   number = 72
 */
function parseUiCardId(cardId: string): { setId?: string; number?: string } {
  if (!cardId.startsWith("pokemon-")) return {};
  const parts = cardId.replace(/^pokemon-/, "").split("-");
  if (parts.length < 2) return {};
  return { setId: parts[0], number: parts[1] };
}

function safeJsonParse(s: string | null | undefined) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

async function fetchFromPokemonTCG(
  apiKey: string | undefined,
  setId?: string,
  number?: string
) {
  if (!setId || !number) return null;
  const q = `set.id:${setId} number:${number}`;
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`;

  const res = await fetch(url, {
    headers: apiKey ? { "X-Api-Key": apiKey } : {},
  });

  if (!res.ok) return null;
  const body = await res.json();
  return body?.data?.[0] ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: { cardId: string } }
) {
  const env = getEnv();
  const cardId = params.cardId;

  const { setId, number } = parseUiCardId(cardId);

  // 1) Try offline D1 cache first (production schema)
  try {
    if (setId && number) {
      const row = (await env.DB.prepare(
        `SELECT id, setId, name, number, rarity, images, raw, updatedAt
         FROM pokemon_cards
         WHERE setId = ? AND number = ?
         LIMIT 1`
      )
        .bind(setId, number)
        .first()) as any;

      if (row) {
        return json({
          source: "d1",
          cardId,
          card: {
            id: row.id,
            setId: row.setId,
            name: row.name,
            number: row.number,
            rarity: row.rarity,
            images: safeJsonParse(row.images),
            raw: safeJsonParse(row.raw),
            updatedAt: row.updatedAt,
          },
        });
      }
    }
  } catch (e: any) {
    // If D1 read fails for some reason, we still try API so user isn't blocked.
  }

  // 2) Not in cache yet → fetch from pokemontcg.io and write-through to D1
  const apiCard = await fetchFromPokemonTCG(env.POKEMONTCG_API_KEY, setId, number);

  if (!apiCard) {
    return err("Card not found (not in D1 cache, and API lookup failed).", 404, {
      cardId,
      tried: { setId, number },
      hint: "If this is a valid card, verify your POKEMONTCG_API_KEY and that the card list endpoint is returning correct ids/numbers.",
    });
  }

  const toStore = {
    id: apiCard.id ?? `${setId ?? "unknown"}-${number ?? "unknown"}`,
    setId: apiCard?.set?.id ?? setId ?? "unknown",
    name: apiCard?.name ?? null,
    number: apiCard?.number ?? number ?? null,
    rarity: apiCard?.rarity ?? null,
    images: JSON.stringify(apiCard?.images ?? null),
    raw: JSON.stringify(apiCard),
  };

  // Best-effort cache write (so next click is offline)
  try {
    await env.DB.prepare(
      `INSERT INTO pokemon_cards (id, setId, name, number, rarity, images, raw, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         setId=excluded.setId,
         name=excluded.name,
         number=excluded.number,
         rarity=excluded.rarity,
         images=excluded.images,
         raw=excluded.raw,
         updatedAt=datetime('now')`
    )
      .bind(
        toStore.id,
        toStore.setId,
        toStore.name,
        toStore.number,
        toStore.rarity,
        toStore.images,
        toStore.raw
      )
      .run();
  } catch {
    // ignore write errors — still return API card
  }

  return json({
    source: "pokemontcg.io",
    cached: true,
    cardId,
    card: {
      id: toStore.id,
      setId: toStore.setId,
      name: toStore.name,
      number: toStore.number,
      rarity: toStore.rarity,
      images: safeJsonParse(toStore.images),
      raw: apiCard,
    },
  });
}
