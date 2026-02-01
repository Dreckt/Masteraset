import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * Bump this string to confirm prod is running latest code.
 */
const BUILD_ID = "admin-import-2026-02-01-gameid-slug-to-uuid-v1";

type ImportType = "cards" | "sets" | "printings";

function json(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

function getAdminImportToken(env: any) {
  return env?.ADMIN_IMPORT_TOKEN ?? (process.env as any)?.ADMIN_IMPORT_TOKEN ?? null;
}

function titleCase(input: string) {
  const s = (input ?? "").toString().trim();
  if (!s) return s;
  return s
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isUuidLike(v: string) {
  const s = (v ?? "").toString().trim();
  // basic UUID v4-ish pattern (good enough for routing)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
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

async function getDiagnostics(DB: D1Database) {
  const fkCards = await DB.prepare(`PRAGMA foreign_key_list(cards);`).all();
  const tiGames = await DB.prepare(`PRAGMA table_info(games);`).all();
  const tiCards = await DB.prepare(`PRAGMA table_info(cards);`).all();
  const gamesCount = await DB.prepare(`SELECT COUNT(1) as c FROM games;`).first();

  return {
    build: BUILD_ID,
    fk_cards: (fkCards as any)?.results ?? fkCards,
    table_info_games: (tiGames as any)?.results ?? tiGames,
    table_info_cards: (tiCards as any)?.results ?? tiCards,
    games_count: (gamesCount as any)?.c ?? gamesCount,
  };
}

/**
 * Load games and build maps:
 * - idSet: existing ids
 * - slugToId: slug -> id
 */
async function loadGameMaps(DB: D1Database) {
  const res = await DB.prepare(`SELECT id, name, slug FROM games;`).all();
  const games: Array<{ id: string; name: string; slug: string }> = (res as any)?.results ?? [];
  const idSet = new Set<string>();
  const slugToId = new Map<string, string>();
  for (const g of games) {
    if (g?.id) idSet.add(g.id);
    if (g?.slug && g?.id) slugToId.set(g.slug, g.id);
  }
  return { games, idSet, slugToId };
}

/**
 * Ensure slugs referenced by CSV exist in games table.
 * If missing, inserts a new game row with a generated UUID id.
 *
 * NOTE: Your prod already has slug 'pokemon' etc, so this should usually do nothing.
 */
async function ensureGameSlugsExist(DB: D1Database, slugs: Set<string>) {
  const { slugToId } = await loadGameMaps(DB);

  const missing: string[] = [];
  for (const s of slugs) {
    if (!slugToId.has(s)) missing.push(s);
  }
  if (!missing.length) return { created: 0, missing: [] as string[] };

  const stmt = DB.prepare(`INSERT INTO games (id, name, slug) VALUES (?, ?, ?)`);

  let created = 0;
  for (const slug of missing) {
    const id = crypto.randomUUID();
    const name = titleCase(slug);
    await stmt.bind(id, name, slug).run();
    created += 1;
  }

  return { created, missing };
}

/**
 * Resolve CSV "game_id" into a valid games.id UUID.
 * - If already a UUID that exists in games.id -> return it.
 * - Otherwise treat it as slug and map slug -> id.
 */
async function resolveGameIdOrThrow(DB: D1Database, raw: string, maps?: Awaited<ReturnType<typeof loadGameMaps>>) {
  const input = (raw ?? "").toString().trim();
  if (!input) throw new Error("Missing required field: game_id");

  const m = maps ?? (await loadGameMaps(DB));

  // If they provided a UUID, accept it if it exists
  if (isUuidLike(input)) {
    if (m.idSet.has(input)) return input;
    throw new Error(`game_id looks like UUID but does not exist in games.id: ${input}`);
  }

  // Otherwise treat as slug
  const mapped = m.slugToId.get(input);
  if (mapped) return mapped;

  throw new Error(`game_id "${input}" did not match any games.slug in DB`);
}

/**
 * GET /api/admin/import
 * - default: diagnostics
 * - ?games=1 : include games rows
 */
export async function GET(req: Request) {
  const ctx: any = getRequestContext();
  const env: any = ctx?.env;
  const DB: D1Database | undefined = env?.DB;

  if (!DB) return json({ build: BUILD_ID, error: "D1 binding DB not available in runtime env." }, { status: 500 });

  try {
    const url = new URL(req.url);
    const includeGames = url.searchParams.get("games") === "1";

    const diag = await getDiagnostics(DB);

    if (includeGames) {
      const maps = await loadGameMaps(DB);
      return json({
        ...diag,
        games: maps.games.sort((a, b) => (a.slug || "").localeCompare(b.slug || "")),
      });
    }

    return json(diag);
  } catch (e: any) {
    return json({ build: BUILD_ID, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ctx: any = getRequestContext();
  const env: any = ctx?.env;

  const adminTokenConfigured = getAdminImportToken(env);
  if (!adminTokenConfigured) {
    return json(
      { build: BUILD_ID, error: "Import failed: ADMIN_IMPORT_TOKEN not configured in Cloudflare Pages (Production)." },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ build: BUILD_ID, error: "Expected multipart/form-data upload." }, { status: 400 });
  }

  const token = (form.get("token") ?? "").toString().trim();
  const type = (form.get("type") ?? "cards").toString().trim() as ImportType;
  const file = form.get("file");

  if (!token) return json({ build: BUILD_ID, error: "Missing token." }, { status: 400 });
  if (token !== adminTokenConfigured) return json({ build: BUILD_ID, error: "Unauthorized." }, { status: 401 });

  if (type !== "cards") {
    return json(
      { build: BUILD_ID, error: "This upload importer currently supports Cards only. (Sets/Printings can be added next.)" },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return json({ build: BUILD_ID, error: "Missing CSV file upload (field name: file)." }, { status: 400 });
  }

  const DB: D1Database | undefined = env?.DB;
  if (!DB) return json({ build: BUILD_ID, error: "D1 binding DB not available in runtime env." }, { status: 500 });

  const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
  const { headers, rows } = parseCsv(text);

  if (!headers.length) return json({ build: BUILD_ID, error: "CSV appears to have no header row." }, { status: 400 });
  if (!rows.length) return json({ build: BUILD_ID, error: "CSV has a header but no data rows." }, { status: 400 });

  // Required by your cards schema (NOT NULL)
  const requiredCols = ["game_id", "canonical_name", "name_sort"];
  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      return json(
        { build: BUILD_ID, error: `CSV missing required column: ${col}`, requiredColumns: requiredCols, foundColumns: headers },
        { status: 400 }
      );
    }
  }

  // Collect non-UUID game_id values as slugs, and ensure those slugs exist (optional safety)
  const slugSet = new Set<string>();
  for (const r of rows) {
    const v = (r.game_id ?? "").toString().trim();
    if (v && !isUuidLike(v)) slugSet.add(v);
  }
  const ensured = await ensureGameSlugsExist(DB, slugSet);

  // Load maps once
  const maps = await loadGameMaps(DB);

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
    const rowNumber = i + 2; // header is line 1

    try {
      const canonical_name = requireString(r.canonical_name, "canonical_name");
      const name_sort = requireString(r.name_sort, "name_sort");

      const rawGame = requireString(r.game_id, "game_id");
      const game_id = await resolveGameIdOrThrow(DB, rawGame, maps);

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

  return json({
    build: BUILD_ID,
    ok: true,
    type,
    parsedRows: rows.length,
    inserted,
    skipped,
    errors,
    game_resolution: {
      ensured,
      note: "CSV may use game_id as slug (e.g. 'pokemon'); importer maps slug->games.id UUID.",
    },
  });
}
