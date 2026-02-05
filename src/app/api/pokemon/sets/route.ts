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

function extractSetId(canonicalName: string) {
  // pokemon-base1-1-alakazam => base1
  const parts = (canonicalName ?? "").split("-");
  return parts.length >= 2 ? parts[1] : null;
}

export async function GET() {
  const { env } = getRequestContext();
  const DB = (env as any)?.DB as D1Database | undefined;

  if (!DB) return json({ error: "DB binding not available" }, { status: 500 });

  const gameRow = await DB.prepare(`SELECT id FROM games WHERE slug = ? LIMIT 1;`)
    .bind("pokemon")
    .first<{ id: string }>();

  if (!gameRow?.id) {
    return json({ error: "Pokemon game row not found (games.slug='pokemon')" }, { status: 500 });
  }

  // Pull canonical_name and derive setIds. (D1/SQLite doesn't have a nice split func.)
  const res = await DB.prepare(
    `SELECT canonical_name, set_name, year
     FROM cards
     WHERE game_id = ? AND canonical_name LIKE 'pokemon-%'
     LIMIT 5000;`
  )
    .bind(gameRow.id)
    .all<any>();

  const rows: any[] = (res as any)?.results ?? [];

  const bySet = new Map<
    string,
    { id: string; name: string; total: number; year: number | null }
  >();

  for (const r of rows) {
    const setId = extractSetId(r.canonical_name);
    if (!setId) continue;

    const prev = bySet.get(setId);
    if (!prev) {
      bySet.set(setId, {
        id: setId,
        name: (r.set_name ?? setId).toString(),
        total: 1,
        year: r.year != null ? Number(r.year) : null,
      });
    } else {
      prev.total += 1;
      if (prev.year == null && r.year != null) prev.year = Number(r.year);
    }
  }

  const data = Array.from(bySet.values()).sort((a, b) => a.id.localeCompare(b.id));

  // Shape similar to PokemonTCG sets endpoint
  return json({
    data: data.map((s) => ({
      id: s.id,
      name: s.name,
      series: "Pokémon",
      total: s.total,
      printedTotal: s.total,
      releaseDate: s.year ? `${s.year}-01-01` : null,
      images: null,
    })),
  });
}
