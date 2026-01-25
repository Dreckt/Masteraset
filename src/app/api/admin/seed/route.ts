import { NextResponse } from "next/server";
import { getEnv, nowIso } from "@/lib/cloudflare";
import { getRank, DEFAULT_RARITY_RANK, DEFAULT_VARIANT_RANK } from "@/lib/rarity";

export const runtime = "edge";

export async function POST(req: Request) {
  const env = getEnv();

  // Seed games
  const games = [
    { id: crypto.randomUUID(), name: "Weiss Schwarz", slug: "weiss" },
    { id: crypto.randomUUID(), name: "Pokémon", slug: "pokemon" },
    { id: crypto.randomUUID(), name: "Magic: The Gathering", slug: "mtg" },
    { id: crypto.randomUUID(), name: "Lorcana", slug: "lorcana" },
    { id: crypto.randomUUID(), name: "One Piece", slug: "one-piece" },
  ];

  for (const g of games) {
    await env.DB.prepare("INSERT OR IGNORE INTO games (id, name, slug) VALUES (?, ?, ?)")
      .bind(g.id, g.name, g.slug).run();
  }

  // Create a tiny demo set under Pokémon
  const pokemon = await env.DB.prepare("SELECT id FROM games WHERE slug='pokemon'").first();
  const setId = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO sets (id, game_id, name, code, release_date, default_language) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(setId, pokemon?.id, "Demo Set (Starter)", "DEMO-001", "2026-01-01", "EN").run();

  // Create 3 demo cards + printings (EN normal + holo)
  const cards = ["Bulbasaur", "Ivysaur", "Venusaur"].map(n => ({
    id: crypto.randomUUID(),
    game_id: pokemon?.id,
    canonical_name: n,
    name_sort: n.toLowerCase()
  }));

  for (const c of cards) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO cards (id, game_id, canonical_name, name_sort) VALUES (?, ?, ?, ?)"
    ).bind(c.id, c.game_id, c.canonical_name, c.name_sort).run();
  }

  const printings = [
    { num: "001", name: "Bulbasaur", rarity: "Common" },
    { num: "002", name: "Ivysaur", rarity: "Uncommon" },
    { num: "003", name: "Venusaur", rarity: "Rare" }
  ];

  for (const p of printings) {
    const card = cards.find(c => c.canonical_name === p.name)!;

    const normalId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO printings
       (id, set_id, card_id, collector_number, language, rarity, rarity_rank, variant, variant_rank, image_url, extra_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
    ).bind(
      normalId, setId, card.id, p.num, "EN",
      p.rarity, getRank(DEFAULT_RARITY_RANK, p.rarity, 999),
      "Normal", getRank(DEFAULT_VARIANT_RANK, "Normal", 999)
    ).run();

    const holoId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO printings
       (id, set_id, card_id, collector_number, language, rarity, rarity_rank, variant, variant_rank, image_url, extra_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
    ).bind(
      holoId, setId, card.id, p.num, "EN",
      p.rarity, getRank(DEFAULT_RARITY_RANK, p.rarity, 999),
      "Holo", getRank(DEFAULT_VARIANT_RANK, "Holo", 999)
    ).run();
  }

  return NextResponse.redirect(new URL("/games", req.url));
}
