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

export async function POST(req: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as CloudflareEnv).DB;

    // auth
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expected = (env as unknown as CloudflareEnv).ADMIN_IMPORT_TOKEN;
    if (expected && token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expect JSON body: { data: SetRow[] }
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          error: "Send JSON body: { data: [...] }",
          example: { data: [{ id: "base1", name: "Base" }] },
        },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { data?: SetRow[] };
    const sets = body.data ?? [];

    if (!Array.isArray(sets) || sets.length === 0) {
      return NextResponse.json({ error: "No data[] provided" }, { status: 400 });
    }

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

    // reliable inserts (no db.batch)
    for (const s of sets) {
      if (!s?.id) continue;
      await stmt
        .bind(
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
        .run();
      imported++;
    }

    return NextResponse.json({ ok: true, imported }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
