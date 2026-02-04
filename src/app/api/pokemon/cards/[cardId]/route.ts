// src/app/api/pokemon/cards/[cardId]/route.ts
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
 * Expected UI cardId format:
 *   pokemon-base1-1-alakazam
 *
 * We derive:
 *   setId = base1
 *   number = 1
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

export async function GET(
  _req: Request,
  { params }: { params: { cardId: string } }
) {
  const env = getEnv();
  const cardId = params.cardId;

  const { setId, number } = parseUiCardId(cardId);

  // 1) Try to read from D1 "pokemon_cards" using production schema:
  // id, setId, name, number, rarity, images, raw, updatedAt
  try {
    // Prefer exact match by setId+number (works for your UI ids)
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
        const images = safeJsonParse(row.images) ?? null;
        const raw = safeJsonParse(row.raw) ?? null;
        return json({
          source: "d1",
          cardId,
          card: {
            id: row.id,
            setId: row.setId,
            name: row.name,
            number: row.number,
            rarity: row.rarity,
            images,
            raw,
            updatedAt: row.updatedAt,
          },
        });
      }
    }

    // Fallback: if UI passes a real pokemontcg card id in the future, allow lookup by id too
    const byId = (await env.DB.prepare(
      `SELECT id, setId, name, number, rarity, images, raw, updatedAt
       FROM pokemon_cards
       WHERE id = ?
       LIMIT 1`
    )
      .bind(cardId)
      .first()) as any;

    if (byId) {
      const images = safeJsonParse(byId.images) ?? null;
      const raw = safeJsonParse(byId.raw) ?? null;
      return json({
        source: "d1",
        cardId,
        card: {
          id: byId.id,
          setId: byId.setId,
          name: byId.name,
          number: byId.number,
          rarity: byId.rarity,
          images,
          raw,
          updatedAt: byId.updatedAt,
        },
      });
    }
  } catch (e: any) {
    return err("Error reading pokemon_cards from D1.", 500, {
      cardId,
      details: String(e),
    });
  }

  // 2) If not in D1, don’t hard-fail with a misleading hint.
  // The product requirement is "offline DB" — so we report missing cache clearly.
  return err("Card not found in offline D1 cache.", 404, {
    cardId,
    hint: "Your pokemon_cards table does not have this card yet. Run/repair the import that stores cards into D1.",
    tried: { setId, number },
  });
}
