CREATE TABLE IF NOT EXISTS pokemon_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  series TEXT,
  releaseDate TEXT,
  printedTotal INTEGER,
  total INTEGER,
  images_symbol TEXT,
  images_logo TEXT,
  updatedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_pokemon_sets_releaseDate ON pokemon_sets(releaseDate);
CREATE INDEX IF NOT EXISTS idx_pokemon_sets_series ON pokemon_sets(series);

