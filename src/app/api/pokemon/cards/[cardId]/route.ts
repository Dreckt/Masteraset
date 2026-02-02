import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    ...init,
  });
}

function extractSetIdFromCanonicalName(canonicalName: string) {
  // pokemon-base1-1-alakazam => base1
  const parts = (canonicalName ?? "").split("-");
  return parts.length >= 2 ? parts[1] : null;
}

function extractNumberFromCanonicalName(canonicalName: string) {
  // pokemon-base1-1-alakazam => 1
  const parts = (canonicalName ?? "").split("-");
  return parts.length >= 3 ? parts[2] : null;
}

export async function GET(_: Request, { params }: { params: { cardId: string } }) {
  const { env } = getRequestContext<any>();
  const DB: D1Database | undefined = env?.DB;

  if (!DB) return json({ error: "DB binding not available" }, { status: 500 });

  const cardId = (params?.cardId ?? "").trim();
  if (!cardId) return json({ error: "Missing cardId param" }, { status: 400 });

  // Find pokemon game UUID
  const gameRow = await DB.prepare(`SELECT id FROM games WHERE slug = ? LIMIT 1;`)
    .bind("pokemon")
    .first<{ id: string }>();

  if (!gameRow?.id) {
    return json({ error: "Pokemon game row not found (games.slug='pokemon')" }, { status: 500 });
  }

  // We store canonical_name as the unique identifier for our imported cards
  const row = await DB.prepare(
    `SELECT canonical_name, card_id, card_name, rarity, set_name, year, image_source, image_filename, image_path
     FROM cards
     WHERE game_id = ? AND canonical_name = ?
     LIMIT 1;`
  )
    .bind(gameRow.id, cardId)
    .first<any>();

  if (!row) {
    return json({ data: null, error: `Card not found: ${cardId}` }, { status: 404 });
  }

  const setId = extractSetIdFromCanonicalName(row.canonical_name) ?? null;
  const number = extractNumberFromCanonicalName(row.canonical_name) ?? null;

  return json({
    source: "d1",
    data: {
      id: row.canonical_name,
      name: row.card_name ?? row.canonical_name,
      number,
      rarity: row.rarity ?? null,
      set: {
        id: setId,
        name: row.set_name ?? null,
      },
      year: row.year ?? null,
      images:
        row.image_path || row.image_filename
          ? {
              small: row.image_path ?? row.image_filename,
              large: row.image_path ?? row.image_filename,
            }
          : null,
      raw: {
        canonical_name: row.canonical_name,
        card_id: row.card_id ?? null,
        image_source: row.image_source ?? null,
        image_filename: row.image_filename ?? null,
        image_path: row.image_path ?? null,
      },
    },
  });
}
