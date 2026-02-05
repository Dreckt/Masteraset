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

export async function GET(_: Request, { params }: { params: { setId: string } }) {
  const { env } = getRequestContext();
  const DB = (env as any)?.DB as D1Database | undefined;

  if (!DB) return json({ error: "DB binding not available" }, { status: 500 });

  const setId = (params?.setId ?? "").trim(); // base1
  if (!setId) return json({ error: "Missing setId param" }, { status: 400 });

  const gameRow = await DB.prepare(`SELECT id FROM games WHERE slug = ? LIMIT 1;`)
    .bind("pokemon")
    .first<{ id: string }>();

  if (!gameRow?.id) {
    return json({ error: "Pokemon game row not found (games.slug='pokemon')" }, { status: 500 });
  }

  const like = `pokemon-${setId}-%`;

  const stats = await DB.prepare(
    `SELECT
       COUNT(1) as total,
       MIN(year) as min_year,
       MAX(year) as max_year,
       MAX(set_name) as set_name
     FROM cards
     WHERE game_id = ? AND canonical_name LIKE ?;`
  )
    .bind(gameRow.id, like)
    .first<any>();

  const total = Number(stats?.total ?? 0);
  if (!total) return json({ data: null, error: `No cards found for setId=${setId}` }, { status: 404 });

  const setName = (stats?.set_name ?? "").toString().trim() || setId;
  const year =
    stats?.min_year && stats?.max_year && stats.min_year === stats.max_year
      ? Number(stats.min_year)
      : stats?.min_year
      ? Number(stats.min_year)
      : null;

  // Minimal shape your page uses: name/series/releaseDate/total/images
  return json({
    data: {
      id: setId,
      name: setName,          // likely "Base" from your CSV
      series: "Pokémon",      // placeholder; can be improved later
      total,
      printedTotal: total,
      releaseDate: year ? `${year}-01-01` : null,
      images: null,
    },
  });
}
