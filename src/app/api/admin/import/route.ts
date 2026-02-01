import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

type ImportType = "cards" | "sets" | "printings";

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

function getAdminToken(env: any) {
  // Check several common names so you don’t get blocked by a naming mismatch.
  return (
    env?.ADMIN_TOKEN ??
    env?.ADMIN_SECRET_TOKEN ??
    env?.ADMIN_SECRET ??
    env?.ADMIN_KEY ??
    (process.env as any)?.ADMIN_TOKEN ??
    (process.env as any)?.ADMIN_SECRET_TOKEN ??
    (process.env as any)?.ADMIN_SECRET ??
    (process.env as any)?.ADMIN_KEY ??
    null
  );
}

/**
 * Minimal CSV parser (supports quoted fields, commas, CRLF/LF).
 */
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (c === "\r") continue;

    field += c;
  }

  row.push(field);
  if (row.some((x) => x.trim().length > 0)) rows.push(row);

  if (!rows.length) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim()).filter(Boolean);
  const out: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const vals = rows[r];
    if (!vals || vals.every((v) => String(v ?? "").trim() === "")) continue;

    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (vals[i] ?? "").toString().trim();
    }
    out.push(obj);
  }

  return { headers, rows: out };
}

function requireString(v: any, name: string): string {
  const s = (v ?? "").toString().trim();
  if (!s) throw new Error(`Missing required field: ${name}`);
  return s;
}

export async function POST(req: Request) {
  const ctx: any = getRequestContext();
  const env: any = ctx?.env;

  const adminTokenConfigured = getAdminToken(env);

  if (!adminTokenConfigured) {
    return json(
      {
        error:
          "Import failed: ADMIN_TOKEN not configured (or named differently). Set ADMIN_TOKEN (recommended) or ADMIN_SECRET_TOKEN in Cloudflare Pages → Variables & Secrets, then redeploy.",
      },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected multipart/form-data upload." }, { status: 400 });
  }

  const token = (form.get("token") ?? "").toString().trim();
  const type = (form.get("type") ?? "cards").toString().trim() as ImportType;
  const file = form.get("file");

  if (!token) return json({ error: "Missing token." }, { status: 400 });
  if (token !== adminTokenConfigured) return json({ error: "Unauthorized." }, { status: 401 });

  if (type !== "cards") {
    return json(
      { error: "This upload importer currently supports Cards only. (Sets/Printings can be added next.)" },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return json({ error: "Missing CSV file upload (field name: file)." }, { status: 400 });
  }

  const DB: D1Database | undefined = env?.DB;
  if (!DB) return json({ error: "D1 binding DB not available in runtime env." }, { status: 500 });

  const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
  const { headers, rows } = parseCsv(text);

  if (!headers.length) return json({ error: "CSV appears to have no header row." }, { status: 400 });
  if (!rows.length) return json({ error: "CSV has a header but no data rows." }, { status: 400 });

  const requiredCols = ["game_id", "canonical_name", "name_sort"];
  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      return json(
        { error: `CSV missing required column: ${col}`, requiredColumns: requiredCols, foundColumns: headers },
        { status: 400 }
      );
    }
  }

  const nowIso = new Date().toISOString();

  let inserted = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string; canonical_name?: string }> = [];

  const stmt = DB.prepare(
    `INSERT OR IGNORE INTO cards (
      id, game_id, canonical_name, name_sort,
      set_name, card_id, card_name, rarity,
      year, image_source, image_filename, image_path,
      created_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?
    )`
  );

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;

    try {
      const game_id = requireString(r.game_id, "game_id");
      const canonical_name = requireString(r.canonical_name, "canonical_name");
      const name_sort = requireString(r.name_sort, "name_sort");

      const id = canonical_name;

      const set_name = (r.set_name ?? "").toString().trim() || null;
      const card_id = (r.card_id ?? "").toString().trim() || null;
      const card_name = (r.card_name ?? "").toString().trim() || null;
      const rarity = (r.rarity ?? "").toString().trim() || null;

      const yearRaw = (r.year ?? "").toString().trim();
      const year = yearRaw ? Number(yearRaw) : null;
      if (yearRaw && Number.isNaN(year)) throw new Error(`Invalid year value: "${yearRaw}"`);

      const image_source = (r.image_source ?? "").toString().trim() || null;
      const image_filename = (r.image_filename ?? "").toString().trim() || null;
      const image_path = (r.image_path ?? "").toString().trim() || null;

      const res = await stmt
        .bind(
          id,
          game_id,
          canonical_name,
          name_sort,
          set_name,
          card_id,
          card_name,
          rarity,
          year,
          image_source,
          image_filename,
          image_path,
          nowIso
        )
        .run();

      const changes = (res as any)?.meta?.changes;
      if (typeof changes === "number") {
        if (changes > 0) inserted += changes;
        else skipped += 1;
      } else {
        inserted += 1;
      }
    } catch (e: any) {
      errors.push({ row: rowNumber, message: e?.message || "Row failed", canonical_name: r.canonical_name });
    }
  }

  return json({ ok: true, type, parsedRows: rows.length, inserted, skipped, errors });
}
