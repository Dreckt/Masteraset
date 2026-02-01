CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  name_sort TEXT NOT NULL,

  set_name TEXT NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,

  rarity TEXT,
  year INTEGER,

  image_source TEXT,
  image_filename TEXT,
  image_path TEXT,

  created_at TEXT,

  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
