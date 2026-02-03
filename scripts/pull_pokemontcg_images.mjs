import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.POKEMONTCG_API_KEY || ""; // optional fallback

const INPUT_CSV = process.argv[2] || "masteraset_cards_base_set_filled.csv";
const OUT_DIR = process.argv[3] || "tmp/pokemon-images/base1";
const OUT_CSV = process.argv[4] || "tmp/base1_images_patch.csv";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

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
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
    return obj;
  });
  return { headers, rows };
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function fetchWithRetry(url, options = {}, maxAttempts = 6) {
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.ok) return res;

      if (!isRetryableStatus(res.status)) return res;

      const backoff = 700 * attempt + Math.floor(Math.random() * 250);
      console.log(`Retryable ${res.status} for ${url} (attempt ${attempt}/${maxAttempts}) waiting ${backoff}ms`);
      await sleep(backoff);
      lastErr = new Error(`${res.status} ${res.statusText}`);
    } catch (e) {
      lastErr = e;
      const backoff = 700 * attempt + Math.floor(Math.random() * 250);
      console.log(`Network error for ${url} (attempt ${attempt}/${maxAttempts}) waiting ${backoff}ms`);
      await sleep(backoff);
    }
  }

  throw lastErr || new Error("fetchWithRetry failed");
}

async function downloadToFile(url, filepath) {
  const res = await fetchWithRetry(url, {}, 6);
  if (!res.ok) return { ok: false, status: res.status };
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buf);
  return { ok: true, status: res.status };
}

// canonical_name: pokemon-base1-1-alakazam => setId=base1, number=1
function parseCanonical(canonical) {
  const parts = String(canonical || "").split("-");
  if (parts.length < 3) return { setId: null, number: null };
  return { setId: parts[1], number: parts[2] };
}

function safeFilename(name) {
  return String(name || "").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function apiSearchCard(setId, number) {
  if (!API_KEY) return null;

  const q = `set.id:${setId} number:"${number}"`;
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`;

  const res = await fetchWithRetry(
    url,
    { headers: { "X-Api-Key": API_KEY } },
    6
  );

  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  const arr = json?.data || [];
  return arr[0] || null;
}

async function main() {
  console.log("Starting image pull (CDN-first)...");
  ensureDir(OUT_DIR);
  ensureDir(path.dirname(OUT_CSV));

  const csvPath = path.resolve(INPUT_CSV);
  if (!fs.existsSync(csvPath)) {
    console.error(`Input CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const { rows } = parseCsv(fs.readFileSync(csvPath, "utf8"));
  console.log(`Rows found: ${rows.length}`);

  const patchHeaders = [
    "game_id",
    "canonical_name",
    "name_sort",
    "set_name",
    "card_id",
    "card_name",
    "rarity",
    "year",
    "image_source",
    "image_filename",
    "image_path",
  ];

  const patchRows = [];
  let ok = 0;
  let fail = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const canonical = r.canonical_name || "";
    const { setId, number } = parseCanonical(canonical);

    // small delay to be polite to the CDN
    await sleep(120);

    try {
      if (!setId || !number) throw new Error("Could not parse setId/number from canonical_name");

      // 1) CDN-first
      const cdnUrl = `https://images.pokemontcg.io/${setId}/${number}.png`;

      const fileBase = safeFilename(`${setId}-${number}-${r.card_name || "card"}`);
      const fileName = `${fileBase}.png`;
      const localPath = path.join(OUT_DIR, fileName);

      let downloaded = false;

      if (!fs.existsSync(localPath)) {
        const dl = await downloadToFile(cdnUrl, localPath);
        if (dl.ok) {
          downloaded = true;
        } else if (dl.status === 404 && API_KEY) {
          // 2) fallback to API search -> images.large
          const card = await apiSearchCard(setId, number);
          const imgUrl = card?.images?.large || card?.images?.small || null;
          if (!imgUrl) throw new Error("CDN 404 and API fallback did not return an image URL");

          // overwrite the localPath using the api URL content
          const dl2 = await downloadToFile(imgUrl, localPath);
          if (!dl2.ok) throw new Error(`API fallback image download failed (${dl2.status})`);
          downloaded = true;
        } else {
          throw new Error(`CDN download failed (${dl.status})`);
        }
      } else {
        downloaded = true;
      }

      if (!downloaded) throw new Error("Unknown download failure");

      patchRows.push({
        game_id: r.game_id || "",
        canonical_name: canonical,
        name_sort: r.name_sort || "",
        set_name: r.set_name || "",
        card_id: r.card_id || "",
        card_name: r.card_name || "",
        rarity: r.rarity || "",
        year: r.year || "",
        image_source: "pokemontcg_cdn",
        image_filename: `base1/${fileName}`,
        image_path: "",
      });

      ok++;
      if (ok % 10 === 0) console.log(`Downloaded ${ok}/${rows.length}...`);
    } catch (e) {
      fail++;
      console.log(`Row ${idx + 2} failed (${canonical}): ${String(e?.message || e)}`);
    }
  }

  const outLines = [];
  outLines.push(patchHeaders.join(","));
  for (const pr of patchRows) {
    outLines.push(patchHeaders.map((h) => csvEscape(pr[h] ?? "")).join(","));
  }
  fs.writeFileSync(OUT_CSV, outLines.join("\n"), "utf8");

  console.log(`Done. Downloaded OK=${ok}, failed=${fail}`);
  console.log(`Images folder: ${OUT_DIR}`);
  console.log(`Patch CSV written: ${OUT_CSV}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
