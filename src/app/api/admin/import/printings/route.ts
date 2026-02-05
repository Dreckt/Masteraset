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
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function badRequest(message: string, extra?: any): Response {
  return jsonResponse({ ok: false, error: message, ...(extra ?? {}) }, 400);
}

function unauthorized(message: string): Response {
  return jsonResponse({ ok: false, error: message }, 401);
}

export async function POST(req: Request): Promise<Response> {
  try {
    // ✅ IMPORTANT: getRequestContext() returns env typed in a way that can break TS builds.
    // We cast it once to our global Env (src/env.d.ts) so env.DB is always valid in TypeScript.
    const { env } = getRequestContext();
    const cfEnv = env as unknown as Env;

    // Basic token presence check (does not validate value)
    const token = requireHeader(req, "x-admin-token");
    if (!token) return unauthorized("Missing required header: x-admin-token");

    const body = (await req.json().catch(() => null)) as any;
    const rows = (body?.rows ?? []) as CsvRow[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return badRequest("Missing 'rows' array in JSON body.");
    }

    const requiredKeys = [
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

    const stmts: D1PreparedStatement[] = [];

    rows.forEach((row, i) => {
      assertRequired(row, requiredKeys, i);

      const gameSlug = normalize(row.game_slug);

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
        cfEnv.DB.prepare(
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

    await cfEnv.DB.batch(stmts);

    return jsonResponse({ ok: true, inserted: stmts.length }, 200);
  } catch (err: any) {
    return jsonResponse(
      {
        ok: false,
        error: "Import failed",
        details: String(err?.message ?? err),
      },
      500
    );
  }
}
