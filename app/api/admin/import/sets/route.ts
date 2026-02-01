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

  // Accept token from either env.ADMIN_TOKEN (Cloudflare-style) or process.env.ADMIN_TOKEN (Node-style)
  const expected =
    String((env as any).ADMIN_TOKEN || "").trim() ||
    String(process.env.ADMIN_TOKEN || "").trim();

  const token = String(req.headers.get("x-admin-token") || "").trim();

  if (!expected) return json(500, { ok: false, error: "ADMIN_TOKEN not configured" });
  if (token !== expected) return json(401, { ok: false, error: "Unauthorized" });

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("text/csv")) return json(400, { ok: false, error: "Upload must be text/csv" });

  const csvText = await req.text();
  const rawRows = parseCSV(csvText);
  if (rawRows.length === 0) return json(400, { ok: false, error: "CSV empty or invalid" });

  // Validate + normalize
  type Row = {
    game_id: string;
    id: string;
    name: string;
    code: string | null;
    release_date: string | null;
    default_language: string | null;
    total_cards: number | null;
  };

  const rows: Row[] = [];

  for (const r of rawRows) {
    const game_id = (r["game_id"] || "").trim();
    const id = (r["id"] || "").trim();
    const name = (r["name"] || "").trim();

    if (!game_id || !id || !name) {
      return json(400, { ok: false, error: "CSV rows must include game_id, id, name" });
    }

    const code = (r["code"] || "").trim() || null;
    const release_date = (r["release_date"] || "").trim() || null;
    const default_language = (r["default_language"] || "").trim() || null;

    const totalRaw = (r["total_cards"] || "").trim();
    const total_cards = totalRaw ? Number(totalRaw) : null;
    if (totalRaw && Number.isNaN(total_cards)) {
      return json(400, { ok: false, error: `Invalid total_cards: ${totalRaw}` });
    }

    rows.push({ game_id, id, name, code, release_date, default_language, total_cards });
  }

  // Import strategy:
  // 1) Disable FK checks temporarily (bulk import stability)
  // 2) Upsert games first
  // 3) Upsert sets
  // 4) Re-enable FK checks
  //
  // This prevents the FK constraint failure you’re seeing during import.
  await db.prepare("PRAGMA foreign_keys = OFF;").run();

  try {
    // Upsert unique games first
    const uniqueGames = Array.from(new Set(rows.map((r) => r.game_id)));
    for (const gid of uniqueGames) {
      // Insert a default name if game doesn't exist. You can later edit names in DB.
      await db
        .prepare("INSERT OR IGNORE INTO games (id, name) VALUES (?, ?)")
        .bind(gid, gid.toUpperCase())
        .run();
    }

    // Upsert sets
    let upserts = 0;
    for (const s of rows) {
      await db
        .prepare(
          `INSERT INTO sets (id, game_id, name, code, release_date, default_language, total_cards)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             game_id=excluded.game_id,
             name=excluded.name,
             code=excluded.code,
             release_date=excluded.release_date,
             default_language=excluded.default_language,
             total_cards=excluded.total_cards`
        )
        .bind(
          s.id,
          s.game_id,
          s.name,
          s.code,
          s.release_date,
          s.default_language,
          s.total_cards
        )
        .run();

      upserts++;
    }

    return json(200, { ok: true, upserts });
  } catch (e: any) {
    // Return the real error message so you see it in the UI
    return json(500, { ok: false, error: String(e?.message || e) });
  } finally {
    await db.prepare("PRAGMA foreign_keys = ON;").run();
  }
}
