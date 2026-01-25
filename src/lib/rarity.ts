export type RarityMap = Record<string, number>;
export type VariantMap = Record<string, number>;

// Keep this minimal; expand per game as you import data.
// These ranks are *per game*, but we can start with defaults.
export const DEFAULT_RARITY_RANK: RarityMap = {
  "Common": 10,
  "Uncommon": 20,
  "Rare": 30,
  "Super Rare": 40,
  "Ultra Rare": 50,
  "Secret Rare": 60
};

export const DEFAULT_VARIANT_RANK: VariantMap = {
  "Normal": 10,
  "Foil": 20,
  "Holo": 20,
  "Alt Art": 30,
  "Serialized": 40,
  "Promo": 50
};

export function getRank(map: Record<string, number>, key: string, fallback = 999) {
  return map[key] ?? fallback;
}
