📄 IMPORT_SPEC.md
# MasteraSet Import Specification

This document defines how card data must be structured when importing into MasteraSet.

The goal is to allow **any card game** (Weiss Schwarz, Pokémon, Sports, etc.) to be imported in a way that preserves:
- True set order
- Variant grouping
- Rarity priority
- Promo handling
- Secret / over-number cards

---

## Core Design Philosophy

Every **physical printing** of a card is its own row.

If a card exists as:
- Normal
- Foil
- Secret
- Promo

It gets **4 rows** in the database.

This is what allows proper master set tracking.

---

## Required CSV Columns

| Column | Description |
|--------|-------------|
| `game_slug` | `weiss`, `pokemon`, `nba`, etc |
| `set_code` | e.g. `WE43`, `PFL`, `151` |
| `set_name` | Human readable name |
| `default_language` | EN, JP, etc |
| `card_canonical_name` | The true card name |
| `name_sort` | Lowercase name used for A–Z sorting |
| `collector_number_raw` | Exactly what is printed on the card |
| `rarity_code` | RR, SP, IGP, etc |
| `variant` | Normal, Foil, Signed, etc |
| `language` | EN, JP, etc |
| `image_url` | Optional |
| `is_promo` | `1` or `0` |
| `notes_json` | Optional metadata |

---

## Collector Number Parsing

We store these fields internally:

| Field | Example |
|------|--------|
| `num_prefix` | `E`, `WE`, `HY` |
| `num_value` | `38` |
| `num_suffix` | `a`, `SP` |
| `numbered_bucket` | Base vs secret |
| `promo_bucket` | Promo last |

Examples:

| Raw | Parsed |
|------|--------|
| `E38` | prefix `E`, value `38` |
| `E38a` | prefix `E`, value `38`, suffix `a` |
| `130/094` | value `130`, bucketed as secret |
| `PR` | Promo bucket |

---

## Rarity Priority

Lower number = earlier in set



C
U
R
RR
RRR
SR
SP
SSP
SEC
IGP
AGR
XR
PR


This ensures:



E38 C
E38 U
E38 R
E38 RR
E38 SP
E38 IGP
E39 C


Always sorts correctly.

---

## Promo Rules

- If a promo has a real number (ex: `E38-PR`), it sorts after base but before no-number promos
- If it has no number, it goes to the end

---

## Why this works for every game

This system handles:

| Game | Problem |
|------|-------|
| Pokémon | Over-numbered secret rares |
| Weiss Schwarz | Multiple rarities per same number |
| Sports | Variants, parallels, serials |
| One Piece | Alt arts and foils |

Because everything is normalized into:
- Number
- Rarity
- Variant
- Promo bucket

---
