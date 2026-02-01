import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type PokemonTcgSetRow = {
  id: string;
  name: string;
  series: string | null;
  releaseDate: string | null;
  printedTotal: number | null;
  total: number | null;
  images_symbol: string | null;
  images_logo: string | null;
  updatedAt: string | null;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

/**
 * DB-ONLY endpoint.
 * We deliberately do NOT call pokemontcg.io anymore.
 *
 * To populate data:
 * - Use your admin/CSV import flow to insert into `pokemon_sets`.
 */
export async function GET(req: Request) {
  const { env } = getRequestContext();
  const db = env.DB as D1Database;

  // Optional: /api/pokemon/sets?limit=250
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit =
    limitRaw && /^\d+$/.test(limitRaw) ? Math.min(parseInt(limitRaw, 10), 1000) : 1000;

  try {
    const r = await db
      .prepare(
        `
        SELECT
          id,
          name,
          series,
          releaseDate,
          printedTotal,
          total,
          images_symbol,
          images_logo,
          updatedAt
        FROM pokemon_sets
        ORDER BY
          CASE WHEN releaseDate IS NULL OR releaseDate = '' THEN 1 ELSE 0 END,
          releaseDate DESC,
          name ASC
        LIMIT ?
      `
      )
      .bind(limit)
      .all();

    const rows = (r.results ?? []) as PokemonTcgSetRow[];

    const data = rows.map((x) => ({
      id: x.id,
      name: x.name,
      series: x.series ?? null,
      releaseDate: x.releaseDate ?? null,
      printedTotal: x.printedTotal ?? null,
      total: x.total ?? null,
      images: {
        symbol: x.images_symbol ?? null,
        logo: x.images_logo ?? null,
      },
      updatedAt: x.updatedAt ?? null,
    }));

    return jsonResponse({ source: "db", count: data.length, data }, { status: 200 });
  } catch (err: any) {
    return jsonResponse(
      {
        error: "DB query failed",
        message: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
