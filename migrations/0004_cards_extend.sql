-- Extend existing cards table to support set-based imports + image metadata
-- Note: D1/SQLite does not allow non-constant defaults on ALTER TABLE ADD COLUMN,
-- so created_at is added with no default and will be set by the import code.

ALTER TABLE cards ADD COLUMN set_name TEXT;
ALTER TABLE cards ADD COLUMN card_id TEXT;
ALTER TABLE cards ADD COLUMN card_name TEXT;
ALTER TABLE cards ADD COLUMN rarity TEXT;
ALTER TABLE cards ADD COLUMN year INTEGER;
ALTER TABLE cards ADD COLUMN image_source TEXT;
ALTER TABLE cards ADD COLUMN image_filename TEXT;
ALTER TABLE cards ADD COLUMN image_path TEXT;
ALTER TABLE cards ADD COLUMN created_at TEXT;
