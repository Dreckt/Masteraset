-- Fix UNIQUE constraint so Weiss can have multiple rarities for the same card number
-- Old: UNIQUE(set_id, collector_number, language, variant)
-- New: UNIQUE(set_id, collector_number, language, rarity, variant)

PRAGMA foreign_keys=OFF;

CREATE TABLE printings_new (
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

  -- Set-order fields added previously
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

INSERT INTO printings_new (
  id, set_id, card_id, collector_number, language, rarity, rarity_rank,
  variant, variant_rank, image_url, extra_json,
  num_prefix, num_value, num_suffix, num_total, numbered_bucket, promo_bucket, set_order_override
)
SELECT
  id, set_id, card_id, collector_number, language, rarity, rarity_rank,
  variant, variant_rank, image_url, extra_json,
  num_prefix, num_value, num_suffix, num_total, numbered_bucket, promo_bucket, set_order_override
FROM printings;

DROP TABLE printings;
ALTER TABLE printings_new RENAME TO printings;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_printings_set ON printings(set_id);
CREATE INDEX IF NOT EXISTS idx_printings_set_order
ON printings(set_id, numbered_bucket, promo_bucket, num_value, rarity_rank, variant_rank);

PRAGMA foreign_keys=ON;
