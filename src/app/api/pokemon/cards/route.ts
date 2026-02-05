// src/app/api/pokemon/cards/route.ts
export const runtime = "edge";
export const dynamic = "force-dynamic";

import { getRequestContext } from "@cloudflare/next-on-pages";

function safeJsonParse(s: string | null | undefined) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const { env } = getRequestContext();
  // ✅ Avoid TS “CloudflareEnv.DB” issues
  const cfEnv = env as any;
  const DB = cfEnv?.DB as D1Database | undefined;

  if (!DB) {
    return json({ error: "DB binding not available" }, 500);
  }

  const url = new URL(req.url);
  const setId = url.searchParams.get("setId")?.trim() || "";

  if (!setId) {
    return json(
      {
        error: "Missing required query param: setId",
        example: "/api/pokemon/cards?setId=base1",
      },
      400
    );
  }

  // Optional: allow basic pagination
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") || "500"), 1),
    2000
  );
  const offset = Math.max(Number(url.searchParams.get("offset") || "0"), 0);

  try {
    const { results } = await DB.prepare(
      `
      SELECT
        id,
        setId,
        name,
        number,
        rarity,
        images
      FROM pokemon_cards
      WHERE setId = ?
      ORDER BY CAST(number AS INTEGER) ASC, number ASC, name ASC
      LIMIT ? OFFSET ?
      `
    )
      .bind(setId, limit, offset)
      .all();

    const data = (results ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      number: r.number,
      rarity: r.rarity,
      images: safeJsonParse(r.images),
    }));

    // ✅ This matches what your set page expects: { data: [...] }
    return json({ data }, 200);
  } catch (e: any) {
    return json(
      {
        error: "Failed to load cards from D1",
        details: String(e?.message ?? e),
        setId,
      },
      500
    );
  }
}
