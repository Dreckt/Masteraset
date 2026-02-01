// src/app/pokemon/sets/[setId]/page.tsx
import Link from "next/link";
import { headers } from "next/headers";

export const runtime = "edge";

type PokemonSet = {
  id: string;
  name?: string;
  series?: string;
  releaseDate?: string;
  printedTotal?: number | null;
  total?: number | null;
};

type PokemonCardRow = {
  id: string;
  setId: string;
  name?: string | null;
  number?: string | null;
  rarity?: string | null;
  images?: string | null;
  updatedAt?: string | null;
};

function getBaseUrlFromHeaders() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "";
  return host ? `${proto}://${host}` : "";
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default async function PokemonSetPage({
  params,
  searchParams,
}: {
  params: { setId: string };
  searchParams?: { page?: string; pageSize?: string };
}) {
  const setId = params.setId;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.min(60, Math.max(1, Number(searchParams?.pageSize ?? "36") || 36));

  const baseUrl = getBaseUrlFromHeaders();

  const [setRes, cardsRes] = await Promise.all([
    fetch(`${baseUrl}/api/pokemon/sets/${encodeURIComponent(setId)}`),
    fetch(
      `${baseUrl}/api/pokemon/cards?setId=${encodeURIComponent(setId)}&page=${page}&pageSize=${pageSize}`
    ),
  ]);

  const setJson = await setRes.json().catch(() => null);
  const cardsJson = await cardsRes.json().catch(() => null);

  const set =
    (setJson && (setJson.data ?? setJson.set ?? setJson)) || null;

  const cards = (cardsJson?.data ?? []) as PokemonCardRow[];
  const count = Number(cardsJson?.count ?? cards.length ?? 0);

  const title = set?.name ?? `Set: ${setId}`;

  const hasPrev = page > 1;
  const hasNext = page * pageSize < count;

  return (
    <main style={{ padding: 20 }}>
      <Link href="/pokemon/sets">← Back to sets</Link>

      <h1 style={{ marginTop: 12 }}>{title}</h1>

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <Link
          href={`/pokemon/sets/${setId}?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`}
          style={{ opacity: hasPrev ? 1 : 0.4, pointerEvents: hasPrev ? "auto" : "none" }}
        >
          Prev
        </Link>

        <span>Page {page}</span>

        <Link
          href={`/pokemon/sets/${setId}?page=${page + 1}&pageSize=${pageSize}`}
          style={{ opacity: hasNext ? 1 : 0.4, pointerEvents: hasNext ? "auto" : "none" }}
        >
          Next
        </Link>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {cards.map((c) => {
          const img = safeJsonParse<{ small?: string; large?: string }>(c.images, {});
          const thumb = img.small ?? img.large ?? "";

          return (
            <Link
              key={c.id}
              href={`/pokemon/cards/${c.id}`}
              style={{
                display: "block",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: 10,
                textDecoration: "none",
              }}
            >
              <div style={{ minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {thumb ? (
                  <img src={thumb} alt={c.name ?? c.id} style={{ width: "100%" }} />
                ) : (
                  <span>No image</span>
                )}
              </div>

              <strong>{c.name ?? "Unknown"}</strong>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{c.number}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{c.rarity}</div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
