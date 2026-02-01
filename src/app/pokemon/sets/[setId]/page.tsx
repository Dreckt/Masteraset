// src/app/pokemon/sets/[setId]/page.tsx

type SearchParams = Record<string, string | string[] | undefined>;

type PokemonSet = {
  id?: string;
  name?: string;
  series?: string;
  releaseDate?: string; // sometimes "1999/01/09"
  printedTotal?: number;
  total?: number;
  images?: any;
};

type PokemonCardRow = {
  id: string;
  setId: string;
  name: string | null;
  number: string | null;
  rarity: string | null;
  images: string | null; // JSON string
  raw: string | null;
  updatedAt: string | null;
};

function first(v: string | string[] | undefined, fallback: string) {
  if (Array.isArray(v)) return v[0] ?? fallback;
  return v ?? fallback;
}

function clampInt(v: string, def: number, min: number, max: number) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function parseImages(images: string | null) {
  if (!images) return null;
  try {
    return JSON.parse(images);
  } catch {
    return null;
  }
}

function normalizeCardNumber(num: string | null) {
  if (!num) return { raw: "", sort: Number.MAX_SAFE_INTEGER };
  // supports "4/102" or "4"
  const head = num.split("/")[0]?.trim() ?? "";
  const n = Number.parseInt(head, 10);
  return { raw: num, sort: Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n };
}

export default async function PokemonSetPage({
  params,
  searchParams,
}: {
  params: { setId: string };
  searchParams: SearchParams;
}) {
  const setId = params.setId;

  // query params
  const page = clampInt(first(searchParams.page, "1"), 1, 1, 9999);
  const pageSize = clampInt(first(searchParams.pageSize, "24"), 24, 6, 96);
  const q = first(searchParams.q, "").trim();
  const rarity = first(searchParams.rarity, "").trim();
  const sort = first(searchParams.sort, "number"); // "number" | "name"

  // Fetch set meta
  const setRes = await fetch(`/api/pokemon/sets/${encodeURIComponent(setId)}`, {
    cache: "no-store",
  });
  const setJson: any = setRes.ok ? await setRes.json().catch(() => null) : null;

  const set: PokemonSet | null =
    (setJson && (setJson.data ?? setJson.set ?? setJson)) || null;

  // Fetch cards from DB/API
  const cardsRes = await fetch(
    `/api/pokemon/cards${buildQuery({ setId, page, pageSize })}`,
    { cache: "no-store" }
  );
  const cardsJson: any = cardsRes.ok ? await cardsRes.json().catch(() => null) : null;

  const rows: PokemonCardRow[] = Array.isArray(cardsJson?.data)
    ? (cardsJson.data as PokemonCardRow[])
    : [];

  const totalCount =
    typeof cardsJson?.count === "number"
      ? cardsJson.count
      : typeof set?.total === "number"
      ? set.total
      : rows.length;

  // Local filtering/sorting (on the loaded page of results)
  const filtered = rows
    .filter((c) => {
      if (!q) return true;
      const name = (c.name ?? "").toLowerCase();
      const num = (c.number ?? "").toLowerCase();
      const id = (c.id ?? "").toLowerCase();
      const needle = q.toLowerCase();
      return name.includes(needle) || num.includes(needle) || id.includes(needle);
    })
    .filter((c) => {
      if (!rarity) return true;
      return (c.rarity ?? "") === rarity;
    });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") {
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    }
    const an = normalizeCardNumber(a.number).sort;
    const bn = normalizeCardNumber(b.number).sort;
    if (an !== bn) return an - bn;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  const uniqueRarities = Array.from(
    new Set(rows.map((c) => (c.rarity ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // paging links
  const totalPages = Math.max(1, Math.ceil(Number(totalCount || 0) / pageSize));
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const baseParams = { pageSize, q: q || undefined, rarity: rarity || undefined, sort };

  const prevHref = `/pokemon/sets/${encodeURIComponent(setId)}${buildQuery({
    ...baseParams,
    page: Math.max(1, page - 1),
  })}`;

  const nextHref = `/pokemon/sets/${encodeURIComponent(setId)}${buildQuery({
    ...baseParams,
    page: Math.min(totalPages, page + 1),
  })}`;

  const title = set?.name ?? `Set: ${setId}`;
  const subtitleParts = [
    set?.series ? String(set.series) : null,
    set?.releaseDate ? String(set.releaseDate) : null,
  ].filter(Boolean);

  return (
    <main className="ms-container" style={{ paddingTop: 18, paddingBottom: 40 }}>
      {/* Breadcrumbs */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <a className="ms-link" href="/pokemon">
          Pokémon
        </a>
        <span style={{ opacity: 0.5 }}>›</span>
        <a className="ms-link" href="/pokemon/sets">
          Sets
        </a>
        <span style={{ opacity: 0.5 }}>›</span>
        <span style={{ opacity: 0.85 }}>{title}</span>
      </div>

      {/* Header */}
      <div style={{ marginTop: 14 }}>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>{title}</h1>

        {subtitleParts.length > 0 ? (
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            {subtitleParts.map((p, idx) => (
              <span key={idx}>
                {idx > 0 ? <span style={{ opacity: 0.5 }}> • </span> : null}
                <span>{p}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Total cards: {Number(set?.total ?? totalCount ?? 0)}
          <span style={{ opacity: 0.5 }}> • </span>
          Loaded: {rows.length}
          <span style={{ opacity: 0.5 }}> • </span>
          Page {page} / {totalPages}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <a
          className="ms-chip"
          aria-disabled={prevDisabled}
          style={prevDisabled ? { pointerEvents: "none", opacity: 0.5 } : undefined}
          href={prevHref}
        >
          ← Prev
        </a>

        <a
          className="ms-chip"
          aria-disabled={nextDisabled}
          style={nextDisabled ? { pointerEvents: "none", opacity: 0.5 } : undefined}
          href={nextHref}
        >
          Next →
        </a>

        <span style={{ opacity: 0.7, fontSize: 13 }}>
          Tip: try <code>?pageSize=12</code> or <code>?pageSize=48</code>
        </span>
      </div>

      {/* Filters (server-rendered via GET form) */}
      <form
        method="GET"
        action={`/pokemon/sets/${encodeURIComponent(setId)}`}
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1fr) 180px 160px 120px",
          gap: 10,
          alignItems: "end",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Search</div>
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, number (4/102), or id…"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "inherit",
              outline: "none",
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Rarity</div>
          <select
            name="rarity"
            defaultValue={rarity}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "inherit",
              outline: "none",
            }}
          >
            <option value="">All</option>
            {uniqueRarities.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Sort</div>
          <select
            name="sort"
            defaultValue={sort}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "inherit",
              outline: "none",
            }}
          >
            <option value="number">Number</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div>
          <input type="hidden" name="pageSize" value={String(pageSize)} />
          <button
            type="submit"
            className="ms-chip"
            style={{
              width: "100%",
              cursor: "pointer",
              border: "none",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            Apply
          </button>
        </div>
      </form>

      {/* Cards Grid */}
      <div style={{ marginTop: 16 }}>
        {sorted.length === 0 ? (
          <div className="ms-card" style={{ padding: 14, opacity: 0.85 }}>
            No cards found for the current filters on this page.
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 8 }}>
              Try clearing Search/Rarity, or increase <code>pageSize</code>.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {sorted.map((c) => {
              const imgs = parseImages(c.images);
              const img = imgs?.small ?? null;

              return (
                <a
                  key={c.id}
                  className="ms-card"
                  style={{ display: "block", padding: 12, textDecoration: "none" }}
                  href={`/pokemon/cards/${encodeURIComponent(c.id)}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 800, lineHeight: 1.15 }}>{c.name ?? c.id}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{c.number ?? ""}</div>
                  </div>

                  {img ? (
                    <img
                      src={img}
                      alt={c.name ?? c.id}
                      style={{
                        width: "100%",
                        height: 220,
                        objectFit: "contain",
                        marginTop: 10,
                      }}
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

                  <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
                    <div>Rarity: {c.rarity ?? "—"}</div>
                    <div style={{ opacity: 0.75 }}>ID: {c.id}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
