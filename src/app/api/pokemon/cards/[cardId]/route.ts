// src/app/api/pokemon/cards/[cardId]/route.ts

import { NextResponse } from "next/server";

export const runtime = "edge";

type PtcgCardResponse = {
  data?: any;
  error?: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await ctx.params;

  if (!cardId || typeof cardId !== "string") {
    return NextResponse.json(
      { error: "Missing cardId", card: null, data: null },
      { status: 400 }
    );
  }

  const apiKey =
    process.env.POKEMONTCG_API_KEY ||
    process.env.POKEMON_TCG_API_KEY ||
    process.env.PTCG_API_KEY ||
    "";

  const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardId)}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: apiKey ? { "X-Api-Key": apiKey } : {},
      // Avoid cached weirdness while debugging
      cache: "no-store",
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Failed to reach PokemonTCG API",
        details: String(e?.message ?? e),
        card: null,
        data: null,
      },
      { status: 502 }
    );
  }

  const text = await resp.text();

  // If upstream isn't JSON, protect the frontend from “malformed response”
  let json: PtcgCardResponse | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json(
      {
        error: "Upstream returned non-JSON",
        status: resp.status,
        snippet: text.slice(0, 300),
        card: null,
        data: null,
      },
      { status: 502 }
    );
  }

  if (!resp.ok) {
    return NextResponse.json(
      {
        error: "PokemonTCG API error",
        status: resp.status,
        upstream: json,
        card: null,
        data: null,
      },
      { status: resp.status }
    );
  }

  const card = json?.data ?? null;

  // Return BOTH shapes so the UI can’t choke:
  // - some callers expect { data: ... }
  // - some expect { card: ... }
  return NextResponse.json(
    { card, data: card },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
