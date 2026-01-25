import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

function norm(s){ return (s ?? "").toString().replace(/\s+/g," ").trim(); }
function lowerSort(s){ return norm(s).toLowerCase(); }

function writeCsv(outPath, rows) {
  if (!rows.length) throw new Error("No rows to write.");
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const v = row[h] ?? "";
        const s = String(v).replace(/"/g,'""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(",")
    )
  ];
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}

async function main() {
  const url = process.argv[2];
  if (!url || !url.startsWith("http")) {
    console.error('Usage: node scripts/scrape_tcgplayer_priceguide_to_csv.mjs "https://..."');
    process.exit(1);
  }

  // Your Masteraset metadata (edit later if you want)
  const game_slug = "weiss";
  const set_code = "QQ-Specials-Premium-Booster";
  const set_name = "The Quintessential Quintuplets Specials Premium Booster";
  const default_language = "EN";
  const language = "EN";

  const outDir = path.resolve(process.cwd(), "imports");
  fs.mkdirSync(outDir, { recursive: true });

  // IMPORTANT: run NOT headless so TCGplayer is less likely to block
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"
  });

  // Log all requests so we can see what’s missing if it fails
  const reqLog = [];
  page.on("request", (r) => reqLog.push({ url: r.url(), method: r.method() }));
  const respLog = [];
  page.on("response", (r) => respLog.push({ url: r.url(), status: r.status(), ct: r.headers()["content-type"] || "" }));

  console.log("Loading page (headful)…");
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

  // If there’s a cookie banner, try clicking an “Accept” button
  // (safe even if it doesn’t exist)
  for (const text of ["Accept", "I Accept", "Agree", "OK"]) {
    const btn = page.getByRole("button", { name: text }).first();
    if (await btn.count().catch(()=>0)) { try { await btn.click({ timeout: 1000 }); } catch {} }
  }

  // Scroll to trigger lazy loading
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(800);
  }

  // Attempt to extract rows from the DOM.
  // We don’t rely on exact selectors; we look for “row-ish” blocks with 2+ pieces of text.
  const rawRows = await page.evaluate(() => {
    const textOf = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();

    // Try common patterns: tables OR row divs
    const candidates = [];

    // Any table rows
    document.querySelectorAll("table tr").forEach((tr) => {
      const cols = Array.from(tr.querySelectorAll("td,th")).map(textOf).filter(Boolean);
      if (cols.length >= 3) candidates.push(cols);
    });

    // Generic “row” divs
    document.querySelectorAll('[class*="row"], [class*="Row"], [class*="product"], [class*="Product"]').forEach((d) => {
      const t = textOf(d);
      if (t.length > 20) {
        // break into chunks by line-ish separators
        const parts = t.split(" ").filter(Boolean);
        if (parts.length > 6) candidates.push([t]);
      }
    });

    return candidates.slice(0, 5000);
  });

  // Save debug artifacts no matter what
  fs.writeFileSync(path.join(outDir, "tcgplayer_requests.json"), JSON.stringify(reqLog, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "tcgplayer_responses.json"), JSON.stringify(respLog, null, 2), "utf8");
  await page.screenshot({ path: path.join(outDir, "tcgplayer_page.png"), fullPage: true });

  // If we got table-like rows, try to parse them
  const parsed = [];
  for (const rr of rawRows) {
    if (!Array.isArray(rr)) continue;

    // Case: table columns
    if (rr.length >= 3) {
      // Heuristic mapping:
      // Usually includes something like: [Name, Rarity, ... , Market Price]
      // We’ll keep only the pieces we can identify.
      const joined = rr.map(norm);

      // Find a collector number-ish token like "E38", "38SP", "5HY/WE43 E38", etc
      const collectorMatch =
        joined.join(" ").match(/\b([A-Z]{1,6}\d{1,4}[A-Z]{0,4}|\d{1,4}[A-Z]{1,4}|\d{1,4}\/\d{1,4}|PR)\b/);
      const collector_number_raw = collectorMatch ? collectorMatch[1] : "";

      // Rarity-like token: RR, RRR, SR, SP, IGP, SEC, etc
      const rarityMatch =
        joined.join(" ").match(/\b(C|U|R|RR|RRR|SR|SP|SSP|SEC|IGP|AGR|XR|PR)\b/i);
      const rarity_code = rarityMatch ? rarityMatch[1].toUpperCase() : "";

      // Name: best guess = first column if it’s not just a number/rarity/price
      const nameGuess = joined.find((x) => x && !/^\$?\d/.test(x) && !/^(C|U|R|RR|RRR|SR|SP|SSP|SEC|IGP|AGR|XR|PR)$/i.test(x)) || "";

      if (nameGuess) {
        parsed.push({
          game_slug,
          set_code,
          set_name,
          default_language,
          card_canonical_name: nameGuess,
          name_sort: lowerSort(nameGuess),
          collector_number_raw,
          rarity_code,
          variant: "Normal",
          language,
          image_url: "",
          is_promo: rarity_code === "PR" || collector_number_raw.toUpperCase() === "PR" ? "1" : "0",
          notes_json: ""
        });
      }
    }
  }

  await browser.close();

  if (!parsed.length) {
    console.error("❌ Could not extract rows from the DOM.");
    console.error("I saved debug files in /imports:");
    console.error("- tcgplayer_page.png");
    console.error("- tcgplayer_requests.json");
    console.error("- tcgplayer_responses.json");
    console.error("Send me those (or at least the responses.json) and I’ll tune the selectors.");
    process.exit(1);
  }

  const csvPath = path.join(outDir, `import_${game_slug}_${set_code}.csv`);
  writeCsv(csvPath, parsed);
  console.log(`✅ Wrote ${parsed.length} rows to: ${csvPath}`);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
