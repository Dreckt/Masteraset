-- Add fields needed for correct set-order sorting (Weiss/Pokemon/etc.)
ALTER TABLE printings ADD COLUMN num_prefix TEXT;
ALTER TABLE printings ADD COLUMN num_value INTEGER;
ALTER TABLE printings ADD COLUMN num_suffix TEXT;
ALTER TABLE printings ADD COLUMN num_total INTEGER;

-- Buckets:
-- numbered_bucket: 0 = normal numbered, 2 = nonconforming/unnumbered (send to end)
ALTER TABLE printings ADD COLUMN numbered_bucket INTEGER NOT NULL DEFAULT 0;

-- promo_bucket: 0 = normal, 1 = promo (send later than normal)
ALTER TABLE printings ADD COLUMN promo_bucket INTEGER NOT NULL DEFAULT 0;

-- Optional manual override (absolute position in checklist if ever needed)
ALTER TABLE printings ADD COLUMN set_order_override INTEGER;

CREATE INDEX IF NOT EXISTS idx_printings_set_order
ON printings(set_id, numbered_bucket, promo_bucket, num_value, rarity_rank, variant_rank);
