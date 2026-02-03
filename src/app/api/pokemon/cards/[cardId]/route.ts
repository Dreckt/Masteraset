// src/app/api/pokemon/cards/[cardId]/route.ts
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

// Cache at Cloudflare edge (fast + resilient). Adjust if you want shorter/longer.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

function ok(data: any, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...CACHE_HEADERS, ...(init?.headers || {}) },
  });
}

function err(message: string, status = 500, extra?: any) {
  return NextResponse.json(
    { error: message, ...(extra || {}) },
    { status, headers: { ...CACHE_HEADERS } }
  );
}

function asObject(maybeJson: any) {
  if (!maybeJson) return null;
  if (typeof maybeJson === "object") return maybeJson;
  if (typeof maybeJson === "string") {
    try {
      return JSON.parse(maybeJson);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: { cardId: string } }
) {
  const cardId = params?.cardId;
  if (!cardId) return err("Missing cardId", 400);

  // D1 binding via next-on-pages request context
  const { env } = getRequestContext();
  const db = env?.DB as D1Database | undefined;

  if (!db) {
    return err("Database binding DB not found (D1 not configured).", 500);
  }

  // Try a couple likely table/column shapes to be resilient.
  // We DO NOT call PokémonTCG here — D1 only.
  const candidates: Array<{
    table: string;
    where: string;
    columns: string;
  }> = [
    // Most common pattern: a JSON blob column
    { table: "pokemon_cards", where: "id = ?", columns: "id, data, json, card" },
    { table: "cards", where: "id = ?", columns: "id, data, json, card" },

    // Flat columns pattern (images may be separate)
    {
      table: "pokemon_cards",
      where: "id = ?",
      columns:
        "id, name, number, setId, rarity, supertype, subtypes, imagesSmall, imagesLarge, imageSmall, imageLarge, image",
    },
    {
      table: "cards",
      where: "id = ?",
      columns:
        "id, name, number, setId, rarity, supertype, subtypes, imagesSmall, imagesLarge, imageSmall, imageLarge, image",
    },
  ];

  let row: any = null;
  let lastError: any = null;

  for (const c of candidates) {
    try {
      const sql = `SELECT ${c.columns} FROM ${c.table} WHERE ${c.where} LIMIT 1`;
      row = await db.prepare(sql).bind(cardId).first();
      if (row) break;
    } catch (e) {
      lastError = e;
      // keep trying other shapes
    }
  }

  if (!row) {
    return err("Card not found in D1. Import may be incomplete.", 404, {
      cardId,
      hint: "This endpoint is D1-only and will not call pokemontcg.io.",
      details: lastError ? String(lastError) : undefined,
    });
  }

  // Prefer JSON blob if present
  const blob =
    asObject((row as any).data) || asObject((row as any).json) || asObject((row as any).card);

  if (blob) {
    // Ensure id is present
    if (!blob.id) blob.id = row.id ?? cardId;
    return ok(blob);
  }

  // Otherwise return the row as-is (flat columns)
  // Normalize some common image fields into an "images" object if possible
  const imageLarge =
    (row as any).imagesLarge || (row as any).imageLarge || (row as any).image || null;
  const imageSmall =
    (row as any).imagesSmall || (row as any).imageSmall || (row as any).image || null;

  const normalized = {
    ...row,
    id: row.id ?? cardId,
    images:
      imageLarge || imageSmall
        ? { large: imageLarge ?? undefined, small: imageSmall ?? undefined }
        : undefined,
  };

  return ok(normalized);
}
