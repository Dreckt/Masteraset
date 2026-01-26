import { NextResponse } from "next/server";

export const runtime = "edge";

type Env = { DB: D1Database };

export async function POST(req: Request) {
  const env = (process.env as any) as Env;

  try {
    const apiKey = process.env.POKEMONTCG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "POKEMONTCG_API_KEY missing" }, { status: 500 });
    }

    // optional simple protection
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expected = process.env.ADMIN_IMPORT_TOKEN;
    if (expected && token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sets list from upstream (one call)
    const upstream = "https://api.pokemontcg.io/v2/sets";

    const controller = new AbortController();
    const timeoutMs = 60000; // batch job timeout
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(upstream, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(t);

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Upstream failed", status: res.status, bodyPreview: text.slice(0, 200) },
        { status: res.status }
      );
    }

    const json = (await res.json()) as { data?: any[] };
    const sets = json.data ?? [];

    // Create table if needed
    await env.DB.exec(`
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

    const now = new Date().toISOString();

    // Upsert rows
    const stmt = env.DB.prepare(`
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

    await env.DB.batch(batch);

    return NextResponse.json({ ok: true, imported: batch.length }, { status: 200 });
  } catch (err: any) {
    const isAbort =
      err?.name === "AbortError" ||
      String(err?.message ?? "").toLowerCase().includes("aborted");

    return NextResponse.json(
      { error: isAbort ? "Import timed out" : (err?.message ?? "Unknown error") },
      { status: isAbort ? 504 : 500 }
    );
  }
}
