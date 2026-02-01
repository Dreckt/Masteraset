import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type PokemonTcgSet = {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  printedTotal?: number;
  total?: number;
  images?: { symbol?: string; logo?: string };
  updatedAt?: string;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function GET(req: Request) {
  const { env } = getRequestContext();
  const db = env.DB as D1Database;

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  // 1) Try DB first (fast + reliable)
  if (!force) {
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
      `
      )
      .all();

    const rows = (r.results ?? []) as any[];
    if (rows.length > 0) {
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
    }
  }

  // 2) DB empty or force=1 -> fetch upstream and cache into D1
  const upstreamUrl = new URL("https://api.pokemontcg.io/v2/sets");
  upstreamUrl.searchParams.set("page", "1");
  upstreamUrl.searchParams.set("pageSize", "250");

  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "masteraset.com (+https://masteraset.com)",
  };

  // Optional (recommended): set this in Cloudflare Pages env
  if (env.POKEMONTCG_API_KEY) {
    headers["X-Api-Key"] = env.POKEMONTCG_API_KEY;
  }

  let res: Response;
  try {
    res = await fetch(upstreamUrl.toString(), { headers });
  } catch (e) {
    return jsonResponse(
      {
        error: "Upstream fetch failed",
        upstream: upstreamUrl.toString(),
        detail: String(e),
        hint: "If the upstream API is having regional issues, try again later or use DB-cached results.",
      },
      { status: 502 }
    );
  }

  const raw = await res.text();

  if (!res.ok) {
    return jsonResponse(
      {
        error: `Upstream error ${res.status}`,
        upstream: upstreamUrl.toString(),
        hint: "If upstream is returning 404/504/520 from Cloudflare, it may be having regional/WAF/rate-limit issues.",
        body: raw ? raw.slice(0, 2000) : "",
      },
      { status: res.status }
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonResponse(
      {
        error: "Upstream returned non-JSON response",
        upstream: upstreamUrl.toString(),
        body: raw.slice(0, 2000),
      },
      { status: 502 }
    );
  }

  const sets = (payload?.data ?? []) as PokemonTcgSet[];
  if (!Array.isArray(sets) || sets.length === 0) {
    return jsonResponse(
      { error: "Upstream returned no set data", upstream: upstreamUrl.toString(), payload },
      { status: 502 }
    );
  }

  // Upsert into D1 so future calls don't depend on upstream
  const stmts = sets.map((s) =>
    db
      .prepare(
        `
        INSERT INTO pokemon_sets (
          id, name, series, releaseDate, printedTotal, total, images_symbol, images_logo, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          series=excluded.series,
          releaseDate=excluded.releaseDate,
          printedTotal=excluded.printedTotal,
          total=excluded.total,
          images_symbol=excluded.images_symbol,
          images_logo=excluded.images_logo,
          updatedAt=excluded.updatedAt
      `
      )
      .bind(
        s.id,
        s.name,
        s.series ?? null,
        s.releaseDate ?? null,
        s.printedTotal ?? null,
        s.total ?? null,
        s.images?.symbol ?? null,
        s.images?.logo ?? null,
        s.updatedAt ?? null
      )
  );

  try {
    await db.batch(stmts);
  } catch (e) {
    // Even if caching fails, still return the upstream data so the UI works
    return jsonResponse(
      {
        source: "upstream",
        count: sets.length,
        data: sets,
        warning: "Fetched from upstream but failed to cache into D1",
        cacheError: String(e),
      },
      { status: 200 }
    );
  }

  return jsonResponse({ source: "upstream", count: sets.length, data: sets }, { status: 200 });
}
