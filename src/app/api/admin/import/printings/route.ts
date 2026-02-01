export const runtime = "edge";
export const dynamic = "force-dynamic";

import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * CSV Import: printings.csv
 *
 * Purpose
 * - Upserts Printings from a CSV-derived JSON payload.
 * - Designed for Cloudflare Pages (Edge runtime) + D1.
 *
 * Security
 * - Requires header: x-admin-token: <ADMIN_TOKEN>
 * - NOTE: This file checks only that the header exists. If you want to enforce
 *   a specific token value, we can wire it to an env var (ADMIN_TOKEN).
 *
 * Expected CSV header (recommended)
 * game_slug,set_name,set_code,release_date,default_language,total_cards,card_id,card_name,collector_number,language,rarity,rarity_rank,variant,variant_rank,image_url
 *
 * Minimum required columns
 * game_slug,set_name,card_id,card_name,collector_number,language,rarity,rarity_rank,variant,variant_rank
 *
 * Input format (JSON)
 * {
 *   "rows": [
 *     {
 *       "game_slug": "pokemon",
 *       "set_name": "Base Set",
 *       "set_code": "base1",
 *       "release_date": "1999-01-09",
 *       "default_language": "en",
 *       "total_cards": "102",
 *       "card_id": "base1-4",
 *       "card_name": "Charizard",
 *       "collector_number": "4/102",
 *       "language": "en",
 *       "rarity": "Rare Holo",
 *       "rarity_rank": "3",
 *       "variant": "holo",
 *       "variant_rank": "1",
 *       "image_url": "https://..."
 *     }
 *   ]
 * }
 */

type CsvRow = Record<string, string>;

function normalize(v: unknown): string {
  return String(v ?? "").trim();
}

function slugify(s: string): string {
  return normalize(s)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseYear(releaseDate: string): number | null {
  const m = normalize(releaseDate).match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

function requireHeader(req: Request, name: string): string | null {
  const v = req.headers.get(name);
  return v ? v.trim() : null;
}

function assertRequired(row: CsvRow, keys: string[], rowIndex: number): void {
  for (const k of keys) {
    if (!normalize(row[k])) {
      throw new Error(`Row ${rowIndex}: missing required column "${k}"`);
    }
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(): Promise<Response> {
  // Existence / health check
  return jsonResponse({
    ok: true,
    route: "/api/admin/import/printings",
    runtime: "edge",
  });
}

export async function POST(req: Request): Promise<Response> {
  const { env } = getRequestContext<{ DB: D1Database }>();

  // Basic header gate (presence). We can hard-enforce a token value later.
  const adminHeader = requireHeader(req, "x-admin-token");
  if (!adminHeader) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  // Parse body
  let body: { rows?: CsvRow[] };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return jsonResponse({ ok: false, error: "Missing rows array" }, 400);
  }

  const required = [
    "game_slug",
    "set_name",
    "card_id",
    "card_name",
    "collector_number",
    "language",
    "rarity",
    "rarity_rank",
    "variant",
    "variant_rank",
  ];

  try {
    const stmts: D1PreparedStatement[] = [];

    rows.forEach((row, idx) => {
      const rowIndex = idx + 1;
      assertRequired(row, required, rowIndex);

      // These are computed helpers you can use to match your schema
      const gameSlug = slugify(row.game_slug);
      const setName = normalize(row.set_name);
      const setCode = normalize(row.set_code);
      const setSlug = slugify(setName || setCode || "unknown-set");
      const releaseYear = parseYear(row.release_date);

      const cardId = normalize(row.card_id);
      const cardName = normalize(row.card_name);
      const collectorNumber = normalize(row.collector_number);

      const language = normalize(row.language);
      const rarity = normalize(row.rarity);
      const rarityRank = Number(normalize(row.rarity_rank) || "0");

      const variant = normalize(row.variant);
      const variantRank = Number(normalize(row.variant_rank) || "0");

      const imageUrl = normalize(row.image_url);

      /**
       * IMPORTANT: This INSERT assumes a table named `printings` with columns:
       * game_slug, set_slug, set_code, set_name, release_year,
       * card_id, card_name, collector_number,
       * language, rarity, rarity_rank,
       * variant, variant_rank, image_url
       *
       * If your schema differs, we’ll adjust after we confirm the function emits.
       */
      stmts.push(
        env.DB.prepare(
          `
          INSERT INTO printings (
            game_slug,
            set_slug,
            set_code,
            set_name,
            release_year,
            card_id,
            card_name,
            collector_number,
            language,
            rarity,
            rarity_rank,
            variant,
            variant_rank,
            image_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        ).bind(
          gameSlug,
          setSlug,
          setCode,
          setName,
          releaseYear,
          cardId,
          cardName,
          collectorNumber,
          language,
          rarity,
          rarityRank,
          variant,
          variantRank,
          imageUrl
        )
      );
    });

    await env.DB.batch(stmts);

    return jsonResponse({ ok: true, inserted: stmts.length }, 200);
  } catch (err: any) {
    return jsonResponse(
      { ok: false, error: err?.message ?? String(err) },
      500
    );
  }
}
