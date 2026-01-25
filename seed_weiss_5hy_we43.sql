-- Game + set
INSERT OR IGNORE INTO games (id, name, slug) VALUES
('g_weiss', 'Weiss Schwarz', 'weiss');

INSERT OR IGNORE INTO sets (id, game_id, name, code, release_date, default_language) VALUES
('s_5hy_we43', 'g_weiss', '5HY/WE43', '5HY/WE43', NULL, 'JP');

-- Cards (minimal demo names)
INSERT OR IGNORE INTO cards (id, game_id, canonical_name, name_sort) VALUES
('c_weiss_e38', 'g_weiss', 'Demo Card E38', 'demo card e38'),
('c_weiss_e39', 'g_weiss', 'Demo Card E39', 'demo card e39'),
('c_weiss_promo1', 'g_weiss', 'Demo Promo', 'demo promo');

-- Printings for E38 across rarities (same number, different rarity)
-- Rarity ranks: C(10) U(20) R(30) RR(40) RRR(50) SR(60) XR(70) AGR(80) SP(90) SSP(100) SEC(110)

INSERT OR IGNORE INTO printings
(id, set_id, card_id, collector_number, language, rarity, rarity_rank, variant, variant_rank, num_prefix, num_value, num_suffix, numbered_bucket, promo_bucket)
VALUES
('p_we38_c',   's_5hy_we43', 'c_weiss_e38', 'E38', 'JP', 'C',   10,  'Normal', 10, 'E', 38, NULL, 0, 0),
('p_we38_u',   's_5hy_we43', 'c_weiss_e38', 'E38', 'JP', 'U',   20,  'Normal', 10, 'E', 38, NULL, 0, 0),
('p_we38_rr',  's_5hy_we43', 'c_weiss_e38', 'E38', 'JP', 'RR',  40,  'Normal', 10, 'E', 38, NULL, 0, 0),
('p_we38_sp',  's_5hy_we43', 'c_weiss_e38', 'E38', 'JP', 'SP',  90,  'Foil',   20, 'E', 38, NULL, 0, 0),
('p_we38_sec', 's_5hy_we43', 'c_weiss_e38', 'E38', 'JP', 'SEC', 110, 'Foil',   20, 'E', 38, NULL, 0, 0),

-- Next number (should appear AFTER all E38 rows)
('p_we39_c',   's_5hy_we43', 'c_weiss_e39', 'E39', 'JP', 'C',   10,  'Normal', 10, 'E', 39, NULL, 0, 0),

-- Nonconforming promo/non-numbered (forced to END)
('p_we_promo', 's_5hy_we43', 'c_weiss_promo1', 'PR', 'JP', 'PR', 999, 'Normal', 10, NULL, NULL, NULL, 2, 1);
