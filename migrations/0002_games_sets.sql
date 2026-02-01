-- Games (Pokemon, Weiss, One Piece, Lorcana, MTG, etc.)
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Sets for each game
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  release_date TEXT,
  total_cards INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE INDEX IF NOT EXISTS idx_sets_game_id ON sets(game_id);
CREATE INDEX IF NOT EXISTS idx_sets_code ON sets(code);
