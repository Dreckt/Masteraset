import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type SetRow = {
  id: string;
  name?: string;
  series?: string;
  releaseDate?: string;
  printedTotal?: number;
  total?: number;
  images?: { symbol?: string; logo?: string };
};

async function fetchJsonWithTimeout(url: string, headers: Record<string, string>, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as CloudflareEnv).DB;

    const apiKey = (env as unknown as CloudflareEnv).POKEMONTCG_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "POKEMONTCG_API_KEY missing" }, { status: 500 });

    // protection
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expected = (env as unknown as CloudflareEnv).ADMIN_IMPORT_TOKEN;
    if (expected && token !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // controls
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? 50), 10), 250); // 10..250
    const maxPages = Math.min(Math.max(Number(url.searchParams.get("maxPages") ?? 30), 1), 200); // safety cap
    const perPageTimeoutMs = Math.min(Math.max(Number(url.searchParams.get("timeoutMs") ?? 12000), 3000), 20000);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS pokemon_sets (
        id TEXT PRIMARY KEY,
        name TEXT,
        series TEXT,
        releaseDate TEXT,
        printedTotal INTEGER,
        total INTEGER,
        images_symbol TEXT,
        images_logo TEXT,
        raw_json TEXT,
        updated_at TEXT
      );
    `);

    const headers = { "X-Api-Key": apiKey, Accept: "application/json" };
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO pokemon_sets
        (id, name, series, releaseDate, printedTotal, total, images_symbol, images_logo, raw_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        series=excluded.series,
        releaseDate=excluded.releaseDate,
        printedTotal=excluded.printedTotal,
        total=excluded.total,
        images_symbol=excluded.images_symbol,
        images_logo=excluded.images_logo,
        raw_json=excluded.raw_json,
        updated_at=excluded.updated_at
    `);

    let imported = 0;
    let page = 1;

    for (; page <= maxPages; page++) {
      const upstream = `https://api.pokemontcg.io/v2/sets?page=${page}&pageSize=${pageSize}`;

      const res = await fetchJsonWithTimeout(upstream, headers, perPageTimeoutMs);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return NextResponse.json(
          {
            error: "Upstream failed",
            status: res.status,
            page,
            pageSize,
            bodyPreview: body.slice(0, 200),
          },
          { status: res.status }
        );
      }

      const json = (await res.json()) as { data?: SetRow[] };
      const sets = json.data ?? [];

      // done
      if (sets.length === 0) break;

      const batch: D1PreparedStatement[] = [];
      for (const s of sets) {
        if (!s?.id) continue;
        batch.push(
          stmt.bind(
            s.id,
            s.name ?? "",
            s.series ?? "",
            s.releaseDate ?? null,
            typeof s.printedTotal === "number" ? s.printedTotal : null,
            typeof s.total === "number" ? s.total : null,
            s.images?.symbol ?? null,
            s.images?.logo ?? null,
            JSON.stringify(s),
            now
          )
        );
      }

      await db.batch(batch);
      imported += batch.length;

      // If we got less than a full page, we're at the end.
      if (sets.length < pageSize) break;
    }

    return NextResponse.json(
      { ok: true, imported, pagesFetched: page, pageSize },
      { status: 200 }
    );
  } catch (err: any) {
    const isAbort =
      err?.name === "AbortError" ||
      String(err?.message ?? "").toLowerCase().includes("aborted") ||
      String(err?.message ?? "").toLowerCase().includes("timeout");

    return NextResponse.json(
      { error: isAbort ? "Import timed out" : (err?.message ?? "Unknown error") },
      { status: isAbort ? 504 : 500 }
    );
  }

}
