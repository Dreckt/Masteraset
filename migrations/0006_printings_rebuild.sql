-- Rebuild printings table with final schema:
-- UNIQUE(set_id, collector_number, language, rarity, variant)
-- Includes set-order fields and indexes.
-- Intended for local reset / clean setup.

PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS printings;

CREATE TABLE printings (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  collector_number TEXT NOT NULL,
  language TEXT NOT NULL,
  rarity TEXT NOT NULL,
  rarity_rank INTEGER NOT NULL,
  variant TEXT NOT NULL,
  variant_rank INTEGER NOT NULL,
  image_url TEXT,
  extra_json TEXT,

  -- Set-order fields
  num_prefix TEXT,
  num_value INTEGER,
  num_suffix TEXT,
  num_total INTEGER,
  numbered_bucket INTEGER NOT NULL DEFAULT 0,
  promo_bucket INTEGER NOT NULL DEFAULT 0,
  set_order_override INTEGER,

  UNIQUE(set_id, collector_number, language, rarity, variant),
  FOREIGN KEY (set_id) REFERENCES sets(id),
  FOREIGN KEY (card_id) REFERENCES cards(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_printings_set ON printings(set_id);
CREATE INDEX IF NOT EXISTS idx_printings_set_order
ON printings(set_id, numbered_bucket, promo_bucket, num_value, rarity_rank, variant_rank);

PRAGMA foreign_keys=ON;
