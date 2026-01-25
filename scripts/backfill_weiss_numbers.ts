import { parseWeissCollectorNumber } from "../src/lib/numbering/weiss";

// This script runs inside Node (not on Cloudflare runtime).
// It updates your LOCAL D1 DB through Wrangler command output, so we keep it simple:
// we print SQL that you execute with `wrangler d1 execute ... --file=-`

async function main() {
  // We can’t directly query D1 from Node without bindings here,
  // so we generate an UPDATE that re-parses based on current fields for Weiss only.
  // We identify Weiss by joining sets->games slug='weiss'.
  // NOTE: This assumes your games.slug for Weiss is 'weiss' (as seeded).
  console.log(`
-- Backfill Weiss parsed numbering fields
UPDATE printings
SET
  num_prefix = NULL,
  num_value = NULL,
  num_suffix = NULL,
  numbered_bucket = 2,
  promo_bucket = CASE WHEN UPPER(rarity) = 'PR' OR collector_number LIKE 'PR%' THEN 1 ELSE 0 END
WHERE set_id IN (
  SELECT s.id FROM sets s
  JOIN games g ON g.id = s.game_id
  WHERE g.slug = 'weiss'
);

-- For rows matching Weiss standard pattern LETTERS + DIGITS + optional LETTERS
UPDATE printings
SET
  num_prefix = REGEXP_REPLACE(collector_number, '^([A-Za-z]+)(\\d+)([A-Za-z]+)?$', '\\1'),
  num_value  = CAST(REGEXP_REPLACE(collector_number, '^([A-Za-z]+)(\\d+)([A-Za-z]+)?$', '\\2') AS INTEGER),
  num_suffix = NULLIF(REGEXP_REPLACE(collector_number, '^([A-Za-z]+)(\\d+)([A-Za-z]+)?$', '\\3'), ''),
  numbered_bucket = 0,
  promo_bucket = CASE WHEN UPPER(rarity) = 'PR' OR collector_number LIKE 'PR%' THEN 1 ELSE 0 END
WHERE set_id IN (
  SELECT s.id FROM sets s
  JOIN games g ON g.id = s.game_id
  WHERE g.slug = 'weiss'
)
AND collector_number GLOB '[A-Za-z]*[0-9]*';
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
