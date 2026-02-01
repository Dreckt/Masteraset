import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * CSV Import: printings.csv
 *
 * Adds/updates:
 * - sets (by deterministic set_id)
 * - cards (by card primary key id)
 * - printings (by deterministic printing id)
 *
 * Security:
 * - Requires header: x-admin-token: <ADMIN_TOKEN>
 *
 * Expected CSV header (recommended):
 * game_slug,set_name,set_code,release_date,default_language,total_cards,card_id,card_name,collector_number,language,rarity,rarity_rank,variant,variant_rank,image_url
 *
 * Minimum required columns:
 * game_slug,set_name,card_id,card_name,collector_number,language,rarity,rarity_rank,variant,variant_rank
 */

export const runtime = "edge";

type CsvRow = Record<string, string>;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseYear(releaseDate: string): number | null {
  const m = (releaseDate || "").match(/^(\d{4})/);
  return m ? Number(m[1]) : null;
}

/**
 * Very small CSV parser that supports:
 * - commas
 * - quoted fields with commas
 * - CRLF/LF
 */
function parseCsv(text: string): CsvRow[] {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && next === '"') {
      // escaped quote
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === "\n")) {
      lines.push(cur.replace(/\r$/, ""));
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim().length) lines.push(cur.replace(/\r$/, ""));

  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map(h => h.trim());
  const rows: CsvRow[] = [];

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line || !line.trim()) continue;
    const cols = splitCsvLine(line);
    const row: CsvRow = {};
    for (let c = 0; c < header.length; c++) {
      row[header[c]] = (cols[c] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function requireField(row: CsvRow, key: string): string {
  const v = (row[key] ?? "").trim();
  if (!v) throw new Error(`Missing required field: ${key}`);
  return v;
}

function parseIntOr(rowVal: string, fallback: number): number {
  const n = Number(rowVal);
  return Number.isFinite(n) ? n : fallback;
}

function parseCollectorNumber(num: string): {
  num_prefix: string | null;
  num_value: number | null;
  num_suffix: string | null;
  num_total: number | null;
} {
  const s = (num || "").trim();

  // Common formats:
  // "4/102", "004/102", "PR-001", "SP1", "SWS-01", "P-5"
  // We'll try best-effort extraction:
  // - total after slash
  // - numeric portion for sorting
  const slash = s.split("/");
  const left = slash[0] ?? s;
  const total = slash.length > 1 ? Number(slash[1]) : null;

  const m = left.match(/^([A-Za-z\-]*)(\d+)([A-Za-z\-]*)$/);
  if (!m) {
    return { num_prefix: null, num_value: null, num_suffix: null, num_total: Number.isFinite(total as any) ? (total as any) : null };
  }

  const prefix = m[1] ? m[1] : null;
  const value = m[2] ? Number(m[2]) : null;
  const suffix = m[3] ? m[3] : null;

  return {
    num_prefix: prefix,
    num_value: Number.isFinite(value as any) ? (value as any) : null,
    num_suffix: suffix,
    num_total: Number.isFinite(total as any) ? (total as any) : null,
  };
}

export async function POST(req: Request) {
  const { env } = getRequestContext();
  const db = (env as any).DB as D1Database;

  // Auth
  const provided = req.headers.get("x-admin-token") || "";
  const expected = ((env as any).ADMIN_TOKEN as string) || "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const bodyText = await req.text();
  if (!bodyText || bodyText.trim().length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "Empty CSV body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let rows: CsvRow[];
  try {
    rows = parseCsv(bodyText);
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: `CSV parse error: ${e?.message || String(e)}` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No rows found in CSV" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let setsUpserted = 0;
  let cardsUpserted = 0;
  let printingsUpserted = 0;
  const errors: Array<{ row: number; error: string }> = [];

  // Wrap in a transaction (best-effort). D1 supports batch; we’ll do per-row statements.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // header is line 1

    try {
      const gameSlug = requireField(row, "game_slug");
      const setName = requireField(row, "set_name");
      const setCode = (row["set_code"] || "").trim();
      const releaseDate = (row["release_date"] || "").trim();
      const defaultLanguage = (row["default_language"] || "").trim();
      const totalCards = (row["total_cards"] || "").trim();

      const cardId = requireField(row, "card_id");
      const cardName = requireField(row, "card_name");

      const collectorNumber = requireField(row, "collector_number");
      const language = requireField(row, "language");

      const rarity = requireField(row, "rarity");
      const rarityRank = parseIntOr(row["rarity_rank"], 999);

      const variant = requireField(row, "variant");
      const variantRank = parseIntOr(row["variant_rank"], 0);

      const imageUrl = (row["image_url"] || "").trim();

      // 1) game_id from games.slug
      const gameRes = await db
        .prepare("SELECT id FROM games WHERE slug = ? LIMIT 1")
        .bind(gameSlug)
        .first<{ id: string }>();

      if (!gameRes?.id) {
        throw new Error(`Unknown game_slug '${gameSlug}'. Add it to games first.`);
      }
      const gameId = gameRes.id;

      // 2) Deterministic set_id
      const setKey = setCode ? setCode : slugify(setName);
      const setId = `${gameSlug}:${setKey}`;

      // Upsert set (id is stable)
      await db
        .prepare(
          `INSERT INTO sets (id, game_id, name, code, release_date, default_language, total_cards)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             game_id=excluded.game_id,
             name=excluded.name,
             code=excluded.code,
             release_date=COALESCE(excluded.release_date, sets.release_date),
             default_language=COALESCE(excluded.default_language, sets.default_language),
             total_cards=COALESCE(excluded.total_cards, sets.total_cards)
          `
        )
        .bind(
          setId,
          gameId,
          setName,
          setCode || null,
          releaseDate || null,
          defaultLanguage || null,
          totalCards ? Number(totalCards) : null
        )
        .run();
      setsUpserted++;

      // 3) Upsert card
      // Your cards table has BOTH:
      // - id (PK)
      // - card_id (NOT NULL)
      //
      // We'll set id = cardId to keep it simple.
      const nameSort = cardName.toLowerCase().trim();
      const year = parseYear(releaseDate);

      await db
        .prepare(
          `INSERT INTO cards (id, game_id, canonical_name, name_sort, set_name, card_id, card_name, rarity, year, image_source, image_filename, image_path, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
           ON CONFLICT(id) DO UPDATE SET
             game_id=excluded.game_id,
             canonical_name=excluded.canonical_name,
             name_sort=excluded.name_sort,
             set_name=excluded.set_name,
             card_id=excluded.card_id,
             card_name=excluded.card_name,
             rarity=COALESCE(excluded.rarity, cards.rarity),
             year=COALESCE(excluded.year, cards.year),
             image_source=COALESCE(excluded.image_source, cards.image_source),
             image_filename=COALESCE(excluded.image_filename, cards.image_filename),
             image_path=COALESCE(excluded.image_path, cards.image_path)
          `
        )
        .bind(
          cardId,
          gameId,
          cardName,
          nameSort,
          setName,
          cardId,
          cardName,
          rarity || null,
          year,
          imageUrl ? "url" : null,
          null,
          null,
          null
        )
        .run();
      cardsUpserted++;

      // 4) Upsert printing
      const numParts = parseCollectorNumber(collectorNumber);

      // Buckets: basic heuristics
      const numberedBucket = numParts.num_value === null ? 2 : 0;
      const promoBucket = /(^pr\b|promo|p-)/i.test(collectorNumber) ? 1 : 0;

      // Deterministic printing id
      const printingId = `${setId}:${collectorNumber}:${language}:${rarity}:${variant}`;

      await db
        .prepare(
          `INSERT INTO printings (
             id, set_id, card_id, collector_number, language, rarity, rarity_rank,
             variant, variant_rank, image_url, extra_json,
             num_prefix, num_value, num_suffix, num_total,
             numbered_bucket, promo_bucket, set_order_override
           ) VALUES (
             ?, ?, ?, ?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?, ?,
             ?, ?, ?
           )
           ON CONFLICT(id) DO UPDATE SET
             set_id=excluded.set_id,
             card_id=excluded.card_id,
             collector_number=excluded.collector_number,
             language=excluded.language,
             rarity=excluded.rarity,
             rarity_rank=excluded.rarity_rank,
             variant=excluded.variant,
             variant_rank=excluded.variant_rank,
             image_url=COALESCE(excluded.image_url, printings.image_url),
             extra_json=COALESCE(excluded.extra_json, printings.extra_json),
             num_prefix=COALESCE(excluded.num_prefix, printings.num_prefix),
             num_value=COALESCE(excluded.num_value, printings.num_value),
             num_suffix=COALESCE(excluded.num_suffix, printings.num_suffix),
             num_total=COALESCE(excluded.num_total, printings.num_total),
             numbered_bucket=excluded.numbered_bucket,
             promo_bucket=excluded.promo_bucket,
             set_order_override=COALESCE(excluded.set_order_override, printings.set_order_override)
          `
        )
        .bind(
          printingId,
          setId,
          cardId,
          collectorNumber,
          language,
          rarity,
          rarityRank,
          variant,
          variantRank,
          imageUrl || null,
          null,
          numParts.num_prefix,
          numParts.num_value,
          numParts.num_suffix,
          numParts.num_total,
          numberedBucket,
          promoBucket,
          null
        )
        .run();
      printingsUpserted++;
    } catch (e: any) {
      errors.push({ row: rowNum, error: e?.message || String(e) });
    }
  }

  const ok = errors.length === 0;
  return new Response(
    JSON.stringify({
      ok,
      rows: rows.length,
      setsUpserted,
      cardsUpserted,
      printingsUpserted,
      errors,
    }),
    { status: ok ? 200 : 400, headers: { "content-type": "application/json" } }
  );
}
