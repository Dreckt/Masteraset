import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type UpstreamSetsResponse = {
  data?: any[];
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
};

async function fetchWithTimeout(url: string, apiKey: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(t);
  }
}

export async function GET(_req: Request) {
  const { env } = getRequestContext();
  const cfEnv = env as any; // keep it simple for Pages typing

  const db = cfEnv.DB as D1Database | undefined;
  const apiKey = cfEnv.POKEMONTCG_API_KEY as string | undefined;

  // 1) Try D1 first (fast)
  if (db) {
    try {
      const rows = await db
        .prepare(
          `SELECT id, name, series, releaseDate, printedTotal, total,
                  images_symbol as symbol, images_logo as logo
           FROM pokemon_sets
           ORDER BY releaseDate ASC`
        )
        .all();

      if (rows?.results?.length) {
        const data = rows.results.map((r: any) => ({
          id: r.id,
          name: r.name,
          series: r.series,
          releaseDate: r.releaseDate,
          printedTotal: r.printedTotal,
          total: r.total,
          images: { symbol: r.symbol, logo: r.logo },
        }));

        return NextResponse.json({ data, source: "d1" }, { status: 200 });
      }
    } catch {
      // table missing or query failed -> fall through to upstream
    }
  }

  // 2) Fallback to upstream if D1 missing/empty
  if (!apiKey) {
    return NextResponse.json(
      { error: "POKEMONTCG_API_KEY missing and no cached sets in D1." },
      { status: 500 }
    );
  }

  const upstream = "https://api.pokemontcg.io/v2/sets?page=1&pageSize=250";

  try {
    const res = await fetchWithTimeout(upstream, apiKey, 12000);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Upstream failed", status: res.status, bodyPreview: txt.slice(0, 200) },
        { status: 502 }
      );
    }

    const json = (await res.json()) as UpstreamSetsResponse;

    return NextResponse.json(
      {
        data: json?.data ?? [],
        page: json?.page,
        pageSize: json?.pageSize,
        count: json?.count,
        totalCount: json?.totalCount,
        source: "upstream",
      },
      { status: 200 }
    );
  } catch (err: any) {
    const msg =
      err?.name === "AbortError" ? "Upstream timed out" : err?.message ?? "Upstream error";
    return NextResponse.json(
      { error: msg, upstream, hint: "Upstream is returning 504s from LAX right now." },
      { status: 504 }
    );
  }
}
