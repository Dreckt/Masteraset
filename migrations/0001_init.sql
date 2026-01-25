-- MasteraSet initial schema (D1 / SQLite)

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  release_date TEXT,
  default_language TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id)
);
CREATE INDEX IF NOT EXISTS idx_sets_game ON sets(game_id);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  name_sort TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id)
);
CREATE INDEX IF NOT EXISTS idx_cards_game ON cards(game_id);
CREATE INDEX IF NOT EXISTS idx_cards_name_sort ON cards(name_sort);

CREATE TABLE IF NOT EXISTS printings (
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
  UNIQUE(set_id, collector_number, language, variant),
  FOREIGN KEY (set_id) REFERENCES sets(id),
  FOREIGN KEY (card_id) REFERENCES cards(id)
);
CREATE INDEX IF NOT EXISTS idx_printings_set ON printings(set_id);
CREATE INDEX IF NOT EXISTS idx_printings_set_number ON printings(set_id, collector_number);
CREATE INDEX IF NOT EXISTS idx_printings_set_rarity ON printings(set_id, rarity_rank);
CREATE INDEX IF NOT EXISTS idx_printings_set_lang ON printings(set_id, language);
CREATE INDEX IF NOT EXISTS idx_printings_set_variant ON printings(set_id, variant_rank);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_items (
  user_id TEXT NOT NULL,
  printing_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  want INTEGER NOT NULL DEFAULT 0,
  for_trade INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, printing_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (printing_id) REFERENCES printings(id)
);
CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);

-- Magic link login tokens + sessions
CREATE TABLE IF NOT EXISTS login_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
