import * as fs from "node:fs";
import { parse } from "csv-parse/sync";

const IN = "imports/import_weiss_QQ-Specials-Premium-Booster.csv";
const OUT = "imports/import_weiss_QQ-Specials-Premium-Booster.cleaned.csv";

const rarityRegex = /\b(IGP|SP|SSP|SEC|AGR|XR|RRR|RR|SR|R|U|C|PR)\b/i;

const input = fs.readFileSync(IN, "utf8");

const records = parse(input, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
  bom: true,
});

let cleaned = records
  .map((r) => ({
    ...r,
    collector_number_raw: (r.collector_number_raw ?? "").trim(),
    rarity_code: (r.rarity_code ?? "").trim().toUpperCase(),
    is_promo: (r.is_promo ?? "0").toString().trim(),
    card_canonical_name: (r.card_canonical_name ?? "").trim(),
  }))
  .filter((r) => r.card_canonical_name && !/^select table row/i.test(r.card_canonical_name));

cleaned = cleaned.map((r) => {
  if (r.rarity_code) return r;

  const name = r.card_canonical_name || "";
  const num = r.collector_number_raw || "";

  const m1 = name.match(rarityRegex);
  if (m1) { r.rarity_code = m1[1].toUpperCase(); return r; }

  const m2 = num.match(/^[A-Z]{0,6}\d{1,4}([A-Z]{1,4})$/i);
  if (m2) { r.rarity_code = m2[1].toUpperCase(); return r; }

  if (num.toUpperCase() === "PR") {
    r.rarity_code = "PR";
    r.is_promo = "1";
  }

  return r;
});

cleaned = cleaned.map((r) => {
  if (r.rarity_code === "PR" || (r.collector_number_raw || "").toUpperCase() === "PR") r.is_promo = "1";
  return r;
});

// Keep original header order
const headers = Object.keys(records[0] || {});
const escape = (v) => {
  const s = String(v ?? "");
  const t = s.replace(/"/g, '""');
  return /[",\n]/.test(t) ? `"${t}"` : t;
};

const outLines = [
  headers.join(","),
  ...cleaned.map((r) => headers.map((h) => escape(r[h])).join(",")),
];

fs.writeFileSync(OUT, outLines.join("\n"), "utf8");
console.log(`✅ Input rows: ${records.length}`);
console.log(`✅ Cleaned rows: ${cleaned.length}`);
console.log(`✅ Wrote: ${OUT}`);
