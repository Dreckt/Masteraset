import fs from "node:fs";
import path from "node:path";

const PATCH_CSV = process.argv[2] || "tmp/base1_images_patch.csv";
const OUT_SQL = process.argv[3] || "tmp/apply_base1_images.sql";

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
    return obj;
  });
  return { headers, rows };
}

function sqlEscape(v) {
  return String(v ?? "").replace(/'/g, "''");
}

// card_id looks like: base1-1, base1-58, etc.
function parseCardId(cardId) {
  const m = String(cardId || "").match(/^([a-z0-9]+)-(\d+)$/i);
  if (!m) return null;
  return { setId: m[1], number: m[2] };
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const csvPath = path.resolve(PATCH_CSV);
  if (!fs.existsSync(csvPath)) {
    console.error(`Patch CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const { rows } = parseCsv(fs.readFileSync(csvPath, "utf8"));
  if (!rows.length) {
    console.error("No rows found in patch CSV.");
    process.exit(1);
  }

  ensureDir(path.dirname(OUT_SQL));

  const sql = [];
  sql.push("-- Auto-generated: apply image URLs to cards");
  sql.push("BEGIN TRANSACTION;");

  let count = 0;
  for (const r of rows) {
    const canonical = r.canonical_name || "";
    const gameId = r.game_id || "pokemon";
    const cardId = r.card_id || "";

    const parsed = parseCardId(cardId);
    if (!parsed) continue;

    const cdnUrl = `https://images.pokemontcg.io/${parsed.setId}/${parsed.number}.png`;

    sql.push(
      `UPDATE cards
SET image_source='pokemontcg_cdn',
    image_filename='${sqlEscape(parsed.setId + "/" + parsed.number + ".png")}',
    image_path='${sqlEscape(cdnUrl)}'
WHERE game_id='${sqlEscape(gameId)}'
  AND canonical_name='${sqlEscape(canonical)}';`
    );

    count++;
  }

  sql.push("COMMIT;");
  fs.writeFileSync(OUT_SQL, sql.join("\n") + "\n", "utf8");

  console.log(`Wrote SQL updates: ${count}`);
  console.log(`SQL file: ${OUT_SQL}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
