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

function parseSetIdFromCanonicalName(canonicalName: string) {
  // canonical_name pattern we used: pokemon-base1-1-alakazam
  // setId is the second segment: base1
  const parts = (canonicalName ?? "").split("-");
  return parts.length >= 2 ? parts[1] : null;
}

function parseNumberFromCanonicalName(canonicalName: string) {
  // pokemon-base1-1-alakazam => "1"
  const parts = (canonicalName ?? "").split("-");
  return parts.length >= 3 ? parts[2] : null;
}

export async function GET(req: Request) {
  const { env } = getRequestContext<any>();
  const DB: D1Database | undefined = env?.DB;

  if (!DB) return json({ error: "DB binding not available" }, { status: 500 });

  const url = new URL(req.url);
  const setId = (url.searchParams.get("setId") ?? "").trim(); // e.g. base1

  if (!setId) {
    return json({ error: "Missing setId query param (e.g. ?setId=base1)" }, { status: 400 });
  }

  // Find pokemon game UUID from games table
  const gameRow = await DB.prepare(`SELECT id FROM games WHERE slug = ? LIMIT 1;`)
    .bind("pokemon")
    .first<{ id: string }>();

  if (!gameRow?.id) {
    return json({ error: "Pokemon game row not found (games.slug='pokemon')" }, { status: 500 });
  }

  // Pull cards that match this set by canonical_name pattern
  // canonical_name starts with: pokemon-{setId}-
  const like = `pokemon-${setId}-%`;

  const res = await DB.prepare(
    `SELECT canonical_name, card_id, card_name, rarity, set_name, year
     FROM cards
     WHERE game_id = ? AND canonical_name LIKE ?
     ORDER BY
       CAST(
         CASE
           WHEN INSTR(canonical_name, 'pokemon-') = 1 THEN
             SUBSTR(canonical_name, LENGTH('pokemon-') + LENGTH(?) + 2, 10)
           ELSE '999999'
         END
       AS INTEGER
     ) ASC,
     canonical_name ASC;`
  )
    // note: we pass setId into the ORDER BY extraction to keep stable numeric ordering
    .bind(gameRow.id, like, setId)
    .all<any>();

  const rows: any[] = (res as any)?.results ?? [];

  // Return in a shape your UI expects (PokemonTCG-like)
  const data = rows.map((r) => {
    const id = r.canonical_name; // stable unique id for internal use
    const name = r.card_name || r.canonical_name;
    const number = parseNumberFromCanonicalName(r.canonical_name);

    return {
      id,
      name,
      number: number ?? null,
      rarity: r.rarity ?? null,
      // you can add images later if/when you store them
      images: null,
    };
  });

  return json({ data seeed: "d1", count: data.length, data });
}
