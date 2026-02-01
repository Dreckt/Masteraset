export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseCSV(csvText: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row.map((v) => v.trim()));
      }
      field = "";
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row.map((v) => v.trim()));
  }

  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  const out: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = rows[i][j] ?? "";
    if (Object.values(obj).some((v) => (v ?? "").trim() !== "")) out.push(obj);
  }

  return out;
}

export async function POST(req: Request) {
  const { env } = getRequestContext();
  const db = (env as any).DB;

  const expected =
    String((env as any).ADMIN_TOKEN || "").trim() ||
    String(process.env.ADMIN_TOKEN || "").trim();

  const token = String(req.headers.get("x-admin-token") || "").trim();
  if (!expected) return json(500, { ok: false, error: "ADMIN_TOKEN not configured" });
  if (token !== expected) return json(401, { ok: false, error: "Unauthorized" });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("text/csv")) {
    return json(400, { ok: false, error: "Upload must be text/csv" });
  }

  const csvText = await req.text();
  const rawRows = parseCSV(csvText);
  if (rawRows.length === 0) return json(400, { ok: false, error: "CSV empty or invalid" });

  const rows = rawRows.map((r) => ({
    game_slug: (r["game_slug"] || "").trim(),
    set_name: (r["set_name"] || "").trim(),
    card_id: (r["card_id"] || "").trim(),
    card_name: (r["card_name"] || "").trim(),
    rarity: (r["rarity"] || "").trim() || null,
    yearRaw: (r["year"] || "").trim(),
    image_source: (r["image_source"] || "").trim() || null,
    image_filename: (r["image_filename"] || "").trim() || null,
  }));

  for (const r of rows) {
    if (!r.game_slug || !r.set_name || !r.card_id || !r.card_name) {
      return json(400, { ok: false, error: "Each row must include game_slug,set_name,card_id,card_name" });
    }
  }

  // Map game_slug -> UUID id (games.id)
  const uniqueSlugs = Array.from(new Set(rows.map((r) => r.game_slug)));
  const placeholders = uniqueSlugs.map(() => "?").join(",");
  const gamesRes = await db
    .prepare(`SELECT id, slug FROM games WHERE slug IN (${placeholders})`)
    .bind(...uniqueSlugs)
    .all();

  const gameMap = new Map<string, string>();
  for (const g of (gamesRes.results ?? []) as any[]) gameMap.set(String(g.slug), String(g.id));

  const missing = uniqueSlugs.filter((s) => !gameMap.has(s));
  if (missing.length > 0) return json(400, { ok: false, error: `Unknown game_slug(s): ${missing.join(", ")}` });

  const nowIso = new Date().toISOString();
  let upserts = 0;

  for (const r of rows) {
    const game_id = gameMap.get(r.game_slug)!;

    const year = r.yearRaw ? Number(r.yearRaw) : null;
    if (r.yearRaw && Number.isNaN(year)) {
      return json(400, { ok: false, error: `Invalid year: ${r.yearRaw}` });
    }

    const internalId = `${r.game_slug}:${r.set_name}:${r.card_id}`;
    const image_path = r.image_filename ? `/cards/${r.game_slug}/${r.image_filename}` : null;

    const canonical_name = r.card_name;
    const name_sort = r.card_name.toLowerCase();

    await db
      .prepare(
        `INSERT INTO cards (
            id, game_id,
            canonical_name, name_sort,
            set_name, card_id, card_name,
            rarity, year,
            image_source, image_filename, image_path,
            created_at
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           game_id=excluded.game_id,
           canonical_name=excluded.canonical_name,
           name_sort=excluded.name_sort,
           set_name=excluded.set_name,
           card_id=excluded.card_id,
           card_name=excluded.card_name,
           rarity=excluded.rarity,
           year=excluded.year,
           image_source=excluded.image_source,
           image_filename=excluded.image_filename,
           image_path=excluded.image_path,
           created_at=COALESCE(cards.created_at, excluded.created_at)`
      )
      .bind(
        internalId,
        game_id,
        canonical_name,
        name_sort,
        r.set_name,
        r.card_id,
        r.card_name,
        r.rarity,
        year,
        r.image_source,
        r.image_filename,
        image_path,
        nowIso
      )
      .run();

    upserts++;
  }

  return json(200, { ok: true, upserts });
}
