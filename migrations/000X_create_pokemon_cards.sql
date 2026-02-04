-- migrations/000X_create_pokemon_cards.sql
-- NOTE: This migration must be compatible with the already-existing remote schema.

-- If pokemon_cards does NOT exist, create it in the schema the project expects in production.
CREATE TABLE IF NOT EXISTS pokemon_cards (
  id TEXT PRIMARY KEY,
  setId TEXT NOT NULL,
  name TEXT,
  number TEXT,
  rarity TEXT,
  images TEXT,
  raw TEXT,
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- Indexes must match the production column names (setId, number).
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_setId ON pokemon_cards(setId);
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_number ON pokemon_cards(number);
