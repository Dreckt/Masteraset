"use client";

import { useEffect, useState } from "react";

type PokemonCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  images?: { small?: string; large?: string };
};

export default function CardsGrid({ setId }: { setId: string }) {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Start small for speed; we’ll add paging next
  const pageSize = 24;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/pokemon/cards?setId=${encodeURIComponent(setId)}&pageSize=${pageSize}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Cards API ${res.status}: ${text.slice(0, 120)}`);
        }

        const json = (await res.json()) as { data?: PokemonCard[] };
        if (!cancelled) setCards(json.data ?? []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load cards");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setId]);

  return (
    <section>
      <h2>Cards</h2>
      {loading && <p style={{ opacity: 0.75 }}>Loading cards…</p>}
      {err && <p style={{ color: "crimson" }}>Error loading cards: {err}</p>}

      {!loading && !err && (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {cards.map((c) => (
            <a
              key={c.id}
              href={`/pokemon/cards/${c.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
                {c.images?.small && (
                  <img
                    src={c.images.small}
                    alt={c.name}
                    style={{ width: "100%", borderRadius: 8 }}
                    loading="lazy"
                  />
                )}
                <div style={{ marginTop: 8 }}>
                  <strong>{c.name}</strong>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    {c.number ? `#${c.number}` : ""}
                    {c.rarity ? ` • ${c.rarity}` : ""}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

