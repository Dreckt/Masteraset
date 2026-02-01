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

function normalizeSet(s: PokemonTcgSet) {
  return {
    id: s.id,
    name: s.name,
    series: s.series ?? null,
    releaseDate: s.releaseDate ?? null,
    printedTotal: s.printedTotal ?? null,
    total: s.total ?? null,
    images: {
      symbol: s.images?.symbol ?? null,
      logo: s.images?.logo ?? null,
    },
    updatedAt: s.updatedAt ?? null,
  };
}

export async function GET(req: Request) {
  const { env } = getRequestContext();
  const db = env.DB as D1Database;

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  // 1) Always try DB first
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
  if (!force && rows.length > 0) {
    const data = rows.map((x) => ({
      id: x.id,
      name: x.name,
      series: x.series ?? null,
      releaseDate: x.releaseDate ?? null,
      printedTotal: x.printedTotal ?? null,
      total: x.total ?? null,
      images: { symbol: x.images_symbol ?? null, logo: x.images_logo ?? null },
      updatedAt: x.updatedAt ?? null,
    }));
    return jsonResponse({ source: "db", count: data.length, data }, { status: 200 });
  }

  // If DB is empty and not forcing, return a helpful 200 (NOT a 404)
  if (!force && rows.length === 0) {
    return jsonResponse(
      {
        source: "db",
        count: 0,
        data: [],
        needs_import: true,
        hint:
          "pokemon_sets table is empty. Seed once via /api/pokemon/sets?force=1 after setting POKEMONTCG_API_KEY in Cloudflare Pages env vars.",
      },
      { status: 200 }
    );
  }

  // 2) Forced refresh: only attempt upstream if API key exists
  const apiKey =
    (env as any).POKEMONTCG_API_KEY ||
    (env as any).POKEMON_API_KEY ||
    (env as any).POKEMONTCG_KEY;

  if (!apiKey) {
    return jsonResponse(
      {
        error: "Missing API key",
        hint:
          "Set POKEMONTCG_API_KEY in Cloudflare Pages (Production + Preview) environment variables, then retry with ?force=1.",
      },
      { status: 400 }
    );
  }

  const upstream = "https://api.pokemontcg.io/v2/sets?page=1&pageSize=250";

  let res: Response;
  try {
    res = await fetch(upstream, {
      headers: {
        "accept": "application/json",
        "user-agent": "masteraset/1.0 (+https://masteraset.com)",
        "X-Api-Key": apiKey,
      },
    });
  } catch (err: any) {
    return jsonResponse(
      {
        error: "Upstream fetch failed",
        upstream,
        detail: String(err?.message ?? err),
        hint: "If this is intermittent, retry. If persistent, the upstream may be region-blocking Cloudflare Workers.",
      },
      { status: 502 }
    );
  }

  const text = await res.text();

  if (!res.ok) {
    return jsonResponse(
      {
        error: `Upstream error ${res.status}`,
        upstream,
        hint: "If upstream is 404/403/429/5xx, it may be WAF/rate-limit/regional issues or a missing/invalid API key.",
        body: text?.slice(0, 500) ?? "",
      },
      { status: 502 }
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    return jsonResponse(
      { error: "Upstream returned non-JSON", upstream, body: text?.slice(0, 500) ?? "" },
      { status: 502 }
    );
  }

  const sets = Array.isArray(payload?.data) ? (payload.data as PokemonTcgSet[]) : [];
  if (!Array.isArray(payload?.data)) {
    return jsonResponse(
      { error: "Unexpected upstream shape", upstream, example: payload ?? null },
      { status: 502 }
    );
  }

  // 3) Upsert into D1 for caching
  const stmt = db.prepare(
    `
    INSERT INTO pokemon_sets (
      id, name, series, releaseDate, printedTotal, total,
      images_symbol, images_logo, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  );

  const batch = sets.map((s) => {
    const n = normalizeSet(s);
    return stmt.bind(
      n.id,
      n.name,
      n.series,
      n.releaseDate,
      n.printedTotal,
      n.total,
      n.images.symbol,
      n.images.logo,
      n.updatedAt
    );
  });

  if (batch.length > 0) {
    await db.batch(batch);
  }

  const data = sets.map(normalizeSet);
  return jsonResponse({ source: "upstream", count: data.length, data }, { status: 200 });
}
