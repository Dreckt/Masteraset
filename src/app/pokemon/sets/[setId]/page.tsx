// /src/app/pokemon/sets/[setId]/page.tsx
import Link from "next/link";

export const runtime = "edge";

type PokemonSetRow = {
  id: string;
  name?: string | null;
  series?: string | null;
  releaseDate?: string | null;
  total?: number | null;
};

type PokemonCardRow = {
  id: string;
  setId: string;
  name?: string | null;
  number?: string | null;
  rarity?: string | null;
  images?: string | null; // stored as JSON string in D1
};

type SetApiResponse =
  | { data?: PokemonSetRow; set?: PokemonSetRow }
  | PokemonSetRow
  | null
  | undefined;

type CardsApiResponse =
  | {
      data?: PokemonCardRow[];
      count?: number;
      page?: number;
      pageSize?: number;
      source?: string;
      warning?: string;
      detail?: string;
    }
  | null
  | undefined;

function safeParseImages(images: string | null | undefined): { small?: string; large?: string } {
  if (!images) return {};
  try {
    const obj = JSON.parse(images);
    if (obj && typeof obj === "object") return obj;
  } catch {}
  return {};
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      // Cloudflare Workers: avoid Next/Node cache flags
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
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

  const page = Math.max(1, Number(searchParams?.page ?? 1));
  const pageSize = Math.min(60, Math.max(5, Number(searchParams?.pageSize ?? 24)));

  // Use absolute URL on the server to avoid edge/runtime baseURL weirdness
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://masteraset.com";

  const setJson = await fetchJson<SetApiResponse>(`${base}/api/pokemon/sets/${encodeURIComponent(setId)}`);
  const cardsJson = await fetchJson<CardsApiResponse>(
    `${base}/api/pokemon/cards?setId=${encodeURIComponent(setId)}&page=${page}&pageSize=${pageSize}`
  );

  const setObj =
    (setJson &&
      typeof setJson === "object" &&
      ("data" in setJson || "set" in setJson)
      ? ((setJson as any).data ?? (setJson as any).set ?? setJson)
      : setJson) || null;

  const set = (setObj as PokemonSetRow | null) ?? null;

  const cards = ((cardsJson as any)?.data ?? []) as PokemonCardRow[];
  const count = Number((cardsJson as any)?.count ?? cards.length ?? 0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <main className="ms-container" style={{ paddingTop: 18, paddingBottom: 40 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link className="ms-link" href="/pokemon">Pokémon</Link>
        <span style={{ opacity: 0.5 }}>›</span>
        <Link className="ms-link" href="/pokemon/sets">Sets</Link>
        <span style={{ opacity: 0.5 }}>›</span>
        <span style={{ opacity: 0.85 }}>{set?.name ?? setId}</span>
      </div>

      <div style={{ marginTop: 14 }}>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>
          {set?.name ?? `Set: ${setId}`}
        </h1>
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          <span>{set?.series ?? "—"}</span>
          <span style={{ opacity: 0.5 }}> • </span>
          <span>{set?.releaseDate ?? "—"}</span>
        </div>
        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Total cards: {set?.total ?? "—"}
          <span style={{ opacity: 0.5 }}> • </span>
          Loaded: {count}
          <span style={{ opacity: 0.5 }}> • </span>
          Page {page} / {totalPages}
        </div>
      </div>

      {/* Pager */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Link
          className="ms-chip"
          href={`/pokemon/sets/${encodeURIComponent(setId)}?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`}
          aria-disabled={page <= 1}
          style={{ pointerEvents: page <= 1 ? "none" : "auto", opacity: page <= 1 ? 0.5 : 1 }}
        >
          ← Prev
        </Link>

        <Link
          className="ms-chip"
          href={`/pokemon/sets/${encodeURIComponent(setId)}?page=${Math.min(totalPages, page + 1)}&pageSize=${pageSize}`}
          aria-disabled={page >= totalPages}
          style={{ pointerEvents: page >= totalPages ? "none" : "auto", opacity: page >= totalPages ? 0.5 : 1 }}
        >
          Next →
        </Link>

        <span style={{ opacity: 0.7, fontSize: 13 }}>
          Tip: add <code>?pageSize=12</code> or <code>?pageSize=48</code>
        </span>
      </div>

      {/* Cards grid */}
      <div style={{ marginTop: 16 }}>
        {cards.length === 0 ? (
          <div className="ms-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800 }}>No cards returned yet</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Your API is working (db source), but this page has no rows for this set/page size.
            </div>
            {(cardsJson as any)?.warning ? (
              <div style={{ marginTop: 8, opacity: 0.75 }}>
                Warning: {(cardsJson as any).warning}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {cards.map((c) => {
              const img = safeParseImages(c.images);
              return (
                <Link
                  key={c.id}
                  href={`/pokemon/cards/${encodeURIComponent(c.id)}`}
                  className="ms-card"
                  style={{ display: "block", padding: 12, textDecoration: "none" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 800, lineHeight: 1.15 }}>{c.name ?? c.id}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{c.number ?? ""}</div>
                  </div>

                  {img.small ? (
                    <img
                      src={img.small}
                      alt={c.name ?? c.id}
                      style={{ width: "100%", height: 220, objectFit: "contain", marginTop: 10 }}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        marginTop: 10,
                        height: 220,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.7,
                        fontSize: 13,
                      }}
                    >
                      No image
                    </div>
                  )}

                  <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
                    <div>Rarity: {c.rarity ?? "—"}</div>
                    <div style={{ opacity: 0.75 }}>ID: {c.id}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
