export type ParsedNumber = {
  num_prefix: string | null;
  num_value: number | null;
  num_suffix: string | null;
  numbered_bucket: number; // 0 normal, 2 send to end
  promo_bucket: number;    // 0 normal, 1 promo
};

export function parseWeissCollectorNumber(collectorNumberRaw: string, rarity?: string): ParsedNumber {
  const raw = (collectorNumberRaw ?? "").trim();

  // Promo heuristics: if rarity is PR or collector_number looks like promo-only, treat as promo
  const promoLike = (rarity ?? "").toUpperCase() === "PR" || /^PR\b/i.test(raw) || /^P\b/i.test(raw);

  // Typical Weiss numbers like "E38", "TD10", "S12" etc.
  // Prefix letters/digits then a number, optional suffix letters after.
  // Examples:
  //  E38  -> prefix E, value 38
  //  TD10 -> prefix TD, value 10
  //  E38a -> prefix E, value 38, suffix a
  const m = raw.match(/^([A-Za-z]+)(\d+)([A-Za-z]+)?$/);

  if (!m) {
    // Can't parse -> send to end; if promo-like, mark promo too.
    return {
      num_prefix: null,
      num_value: null,
      num_suffix: null,
      numbered_bucket: 2,
      promo_bucket: promoLike ? 1 : 0,
    };
  }

  const num_prefix = m[1] ?? null;
  const num_value = m[2] ? parseInt(m[2], 10) : null;
  const num_suffix = m[3] ?? null;

  return {
    num_prefix,
    num_value: Number.isFinite(num_value as number) ? (num_value as number) : null,
    num_suffix,
    numbered_bucket: 0,
    promo_bucket: promoLike ? 1 : 0,
  };
}
