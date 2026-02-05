// src/app/api/pokemon/import/sets/route.ts
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { getRequestContext } from "@cloudflare/next-on-pages";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalize(v: unknown): string {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const { env } = getRequestContext();
    const db = (env as any)?.DB as D1Database | undefined;
    const expectedToken =
      (env as any)?.ADMIN_IMPORT_TOKEN as string | undefined;

    if (!db) return json({ error: "DB binding not available" }, 500);

    // auth
    const provided = normalize(req.headers.get("x-admin-token"));
    if (!expectedToken) {
      return json(
        {
          error: "ADMIN_IMPORT_TOKEN is not configured on the environment.",
          hint: "Set ADMIN_IMPORT_TOKEN in Cloudflare Pages env vars.",
        },
        500
      );
    }
    if (!provided || provided !== expectedToken) {
      return json(
        {
          error: "Unauthorized",
          hint: "Provide header x-admin-token matching ADMIN_IMPORT_TOKEN.",
        },
        401
      );
    }

    const body = (await req.json().catch(() => null)) as any;
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return json(
        {
          error: "No rows provided",
          expected: { rows: [{ id: "base1", name: "Base Set", series: "Base", releaseDate: "1999/01/09", printedTotal: 102, total: 102, images: { symbol: "...", logo: "..." } }] },
        },
        400
      );
    }

    // This route imports Pokémon SETS into pokemon_sets table.
    // We keep it tolerant: insert/update by id.
    const stmts: D1PreparedStatement[] = [];

    for (const r of rows) {
      const id = normalize(r.id);
      if (!id) continue;

      const name = normalize(r.name) || null;
      const series = normalize(r.series) || null;
      const releaseDate = normalize(r.releaseDate) || null;

      const printedTotal =
        r.printedTotal === null || r.printedTotal === undefined || r.printedTotal === ""
          ? null
          : Number(r.printedTotal);

      const total =
        r.total === null || r.total === undefined || r.total === ""
          ? null
          : Number(r.total);

      const imagesJson = JSON.stringify(r.images ?? null);
      const rawJson = JSON.stringify(r);

      stmts.push(
        db
          .prepare(
            `
            INSERT INTO pokemon_sets (id, name, series, releaseDate, printedTotal, total, images, raw, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              series=excluded.series,
              releaseDate=excluded.releaseDate,
              printedTotal=excluded.printedTotal,
              total=excluded.total,
              images=excluded.images,
              raw=excluded.raw,
              updatedAt=datetime('now')
            `
          )
          .bind(id, name, series, releaseDate, printedTotal, total, imagesJson, rawJson)
      );
    }

    if (stmts.length === 0) {
      return json({ error: "No valid rows (missing id)" }, 400);
    }

    await db.batch(stmts);

    return json({ ok: true, upserted: stmts.length }, 200);
  } catch (e: any) {
    return json(
      {
        error: "Import failed",
        details: String(e?.message ?? e),
      },
      500
    );
  }
}
