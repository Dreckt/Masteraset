"use client";

import { useEffect, useState } from "react";

type PokemonCard = {
  id: string;
  name: string;
  number?: string;
  rarity?: string;
  images?: {
    small?: string;
    large?: string;
  };
};

export default function CardsGrid({ setId }: { setId: string }) {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start small so loads are fast (paging comes later)
  const PAGE_SIZE = 24;

  useEffect(() => {
    let cancelled = false;

    async function loadCards() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/pokemon/cards?setId=${encodeURIComponent(setId)}&pageSize=${PAGE_SIZE}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Cards API ${res.status}: ${text.slice(0, 150)}`);
        }

        const json = (await res.json()) as { data?: PokemonCard[] };

        if (!cancelled) {
          setCards(json.data ?? []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load cards");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCards();

    return () => {
      cancelled = true;
    };
  }, [setId]);

  return (
    <section>
      <h2>Cards</h2>

      {loading && (
        <p style={{ opacity: 0.75, marginTop: 8 }}>
          Loading cards…
        </p>
      )}

      {error && (
        <p style={{ color: "crimson", marginTop: 8 }}>
          Failed to load cards: {error}
        </p>
      )}

      {!loading && !error && (
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
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 12,
                  background: "#fff",
                  transition: "transform .15s ease, box-shadow .15s ease",
                }}
              >
                {c.images?.small && (
                  <img
                    src={c.images.small}
                    alt={c.name}
                    loading="lazy"
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      background: "#f3f3f3",
                    }}
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
