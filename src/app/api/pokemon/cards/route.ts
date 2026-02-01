import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type PokemonCardRow = {
  id: string;
  setId: string;
  name?: string | null;
  number?: string | null;
  rarity?: string | null;
  images?: string | null; // JSON string for now
  raw?: string | null;    // JSON string for now
  updatedAt?: string | null;
};

function intParam(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const setId = (url.searchParams.get("setId") || "").trim();

  if (!setId) {
    return NextResponse.json(
      { error: "Missing required query param: setId" },
      { status: 400 }
    );
  }

  const pageSize = clamp(intParam(url.searchParams.get("pageSize"), 50), 1, 100);
  const page = clamp(intParam(url.searchParams.get("page"), 1), 1, 100000);
  const offset = (page - 1) * pageSize;

  // D1 binding (keep both names to be resilient if we rename later)
  const { env } = getRequestContext();
  const db: D1Database | undefined = (env as any).DB || (env as any).MASTERASET_DB;

  if (!db) {
    // No D1 binding at runtime — return stub (NOT a 500)
    return NextResponse.json(
      {
        source: "stub",
        count: 0,
        data: [],
        warning:
          "D1 binding not found (expected env.DB). Endpoint is keyless and safe.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    // IMPORTANT: Only select columns that exist in pokemon_cards.
    // (Your current error was from referencing a non-existent column like `setName`.)
    const sql = `
      SELECT
        id,
        setId,
        name,
        number,
        rarity,
        images,
        raw,
        updatedAt
      FROM pokemon_cards
      WHERE setId = ?
      ORDER BY
        CASE
          WHEN number GLOB '*[^0-9]*' THEN 1
          ELSE 0
        END,
        CAST(number AS INTEGER),
        number,
        id
      LIMIT ? OFFSET ?;
    `;

    const r = await db.prepare(sql).bind(setId, pageSize, offset).all<PokemonCardRow>();
    const rows = (r.results || []) as PokemonCardRow[];

    return NextResponse.json(
      {
        source: "db",
        count: rows.length,
        data: rows,
        page,
        pageSize,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    // Keep endpoint keyless/safe; return stub on DB errors
    return NextResponse.json(
      {
        source: "stub",
        count: 0,
        data: [],
        warning:
          "Cards table/query not available yet (pokemon_cards). Endpoint is keyless and safe.",
        detail: `D1_ERROR: ${e?.message || String(e)}`,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
