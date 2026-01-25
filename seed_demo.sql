INSERT OR IGNORE INTO games (id, name, slug) VALUES
('g_weiss', 'Weiss Schwarz', 'weiss'),
('g_pokemon', 'Pokémon', 'pokemon'),
('g_mtg', 'Magic: The Gathering', 'mtg'),
('g_lorcana', 'Lorcana', 'lorcana'),
('g_onepiece', 'One Piece', 'one-piece');

INSERT OR IGNORE INTO sets (id, game_id, name, code, release_date, default_language) VALUES
('s_demo_pokemon', 'g_pokemon', 'Demo Set (Starter)', 'DEMO-001', '2026-01-01', 'EN');

INSERT OR IGNORE INTO cards (id, game_id, canonical_name, name_sort) VALUES
('c_bulbasaur', 'g_pokemon', 'Bulbasaur', 'bulbasaur'),
('c_ivysaur',   'g_pokemon', 'Ivysaur',   'ivysaur'),
('c_venusaur',  'g_pokemon', 'Venusaur',  'venusaur');

INSERT OR IGNORE INTO printings
(id, set_id, card_id, collector_number, language, rarity, rarity_rank, variant, variant_rank, image_url, extra_json) VALUES
('p_bulba_001_en_normal', 's_demo_pokemon', 'c_bulbasaur', '001', 'EN', 'Common',   10, 'Normal', 10, NULL, NULL),
('p_bulba_001_en_holo',   's_demo_pokemon', 'c_bulbasaur', '001', 'EN', 'Common',   10, 'Holo',   20, NULL, NULL),

('p_ivysaur_002_en_normal','s_demo_pokemon','c_ivysaur',   '002', 'EN', 'Uncommon', 20, 'Normal', 10, NULL, NULL),
('p_ivysaur_002_en_holo',  's_demo_pokemon','c_ivysaur',   '002', 'EN', 'Uncommon', 20, 'Holo',   20, NULL, NULL),

('p_venusaur_003_en_normal','s_demo_pokemon','c_venusaur', '003', 'EN', 'Rare',     30, 'Normal', 10, NULL, NULL),
('p_venusaur_003_en_holo',  's_demo_pokemon','c_venusaur', '003', 'EN', 'Rare',     30, 'Holo',   20, NULL, NULL);
