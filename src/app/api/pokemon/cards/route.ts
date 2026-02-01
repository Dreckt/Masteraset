import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type PokemonCardRow = {
  id: string;
  name: string;
  number?: string | null;
  rarity?: string | null;
  setId: string;
  setName?: string | null;
  imageSmall?: string | null;
  imageLarge?: string | null;
};

function intParam(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const setId = url.searchParams.get("setId")?.trim() || "";
  const page = intParam(url.searchParams.get("page"), 1);
  const pageSize = Math.min(intParam(url.searchParams.get("pageSize"), 25), 250);
  const offset = (page - 1) * pageSize;

  // This endpoint is intentionally KEYLESS.
  // It should never require pokemontcg.io or any API key.
  if (!setId) {
    return NextResponse.json(
      { error: "Missing required query param: setId" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  // D1 first
  try {
    const { env } = getRequestContext();
    const db: D1Database | undefined = (env as any)?.DB;

    if (!db) {
      return NextResponse.json(
        {
          source: "stub",
          count: 0,
          data: [],
          warning: "D1 binding not found (expected env.DB). Endpoint is keyless and safe.",
        },
        { status: 200, headers: { "cache-control": "no-store" } }
      );
    }

    // Expecting a table like:
    // pokemon_cards(id TEXT PRIMARY KEY, setId TEXT, name TEXT, number TEXT, rarity TEXT, imageSmall TEXT, imageLarge TEXT, ...)
    const result = await db
      .prepare(
        `
        SELECT
          id,
          name,
          number,
          rarity,
          setId,
          setName,
          imageSmall,
          imageLarge
        FROM pokemon_cards
        WHERE setId = ?
        ORDER BY
          CASE
            WHEN number GLOB '[0-9]*' THEN CAST(number AS INTEGER)
            ELSE 999999
          END ASC,
          number ASC,
          name ASC
        LIMIT ? OFFSET ?;
        `
      )
      .bind(setId, pageSize, offset)
      .all<PokemonCardRow>();

    const rows = (result.results ?? []) as PokemonCardRow[];

    return NextResponse.json(
      {
        source: "db",
        setId,
        page,
        pageSize,
        count: rows.length,
        data: rows,
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (err: any) {
    // If the table doesn't exist yet (your current situation), do NOT throw a 500.
    // Return a safe stub response so pages can render.
    const msg = String(err?.message || err || "Unknown error");
    return NextResponse.json(
      {
        source: "stub",
        count: 0,
        data: [],
        warning: "Cards table not available yet (pokemon_cards). This endpoint is now keyless and safe.",
        detail: msg,
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  }
}
