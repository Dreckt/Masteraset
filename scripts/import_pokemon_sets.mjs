// scripts/import_pokemon_sets.mjs
// Usage:
//   POKEMONTCG_API_KEY=xxxx ADMIN_IMPORT_TOKEN=yyyy node scripts/import_pokemon_sets.mjs
//
// Optional:
//   SITE=https://masteraset.com PAGE_SIZE=250 node scripts/import_pokemon_sets.mjs

const SITE = process.env.SITE || "https://masteraset.com";
const API_KEY = process.env.POKEMONTCG_API_KEY;
const TOKEN = process.env.ADMIN_IMPORT_TOKEN;
const PAGE_SIZE = Number(process.env.PAGE_SIZE || 250);

if (!API_KEY) {
  console.error("Missing POKEMONTCG_API_KEY env var");
  process.exit(1);
}
if (!TOKEN) {
  console.error("Missing ADMIN_IMPORT_TOKEN env var");
  process.exit(1);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "X-Api-Key": API_KEY, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstream failed ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function postChunk(data) {
  const url = `${SITE}/api/pokemon/import/sets?token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Import failed ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  let page = 1;
  let totalImported = 0;

  while (true) {
    const upstream = `https://api.pokemontcg.io/v2/sets?page=${page}&pageSize=${PAGE_SIZE}`;
    console.log(`Fetching page ${page}...`);
    const json = await fetchJson(upstream);
    const sets = json.data || [];

    if (!sets.length) break;

    console.log(`Posting ${sets.length} sets to D1...`);
    const result = await postChunk(sets);
    totalImported += result.imported || 0;

    console.log(`OK: imported ${result.imported}. Total=${totalImported}`);

    if (sets.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`DONE. Total imported: ${totalImported}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
