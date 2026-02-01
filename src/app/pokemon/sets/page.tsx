import { headers } from "next/headers";

export const runtime = "edge";

type PokemonSetRow = {
  id: string;
  name: string;
  series: string | null;
  releaseDate: string | null;
  printedTotal: number | null;
  total: number | null;
  images: { symbol: string | null; logo: string | null };
  updatedAt: string | null;
};

function getOriginFromHeaders() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "masteraset.com";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export default async function PokemonSetsPage() {
  const origin = getOriginFromHeaders();

  const res = await fetch(`${origin}/api/pokemon/sets`, {
    headers: { accept: "application/json" },
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    return (
      <main className="ms-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Pokémon Sets</h1>
        <p style={{ color: "var(--ms-muted)" }}>Couldn’t load sets.</p>
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {JSON.stringify({ status: res.status, payload }, null, 2)}
        </pre>
      </main>
    );
  }

  const data = (payload?.data ?? []) as PokemonSetRow[];

  return (
    <main className="ms-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Pokémon Sets</h1>
        <div className="ms-chip" style={{ opacity: 0.9 }}>
          {payload?.source === "db" ? "DB" : "Unknown"} • {data.length}
        </div>
      </div>

      {data.length === 0 ? (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            background: "rgba(11,14,20,0.35)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No sets loaded yet</div>
          <div style={{ color: "var(--ms-muted)" }}>
            Use your admin/CSV import flow to populate the <code>pokemon_sets</code> table.
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {data.map((s) => (
            <a
              key={s.id}
              href={`/pokemon/sets/${encodeURIComponent(s.id)}`}
              style={{
                display: "block",
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(11,14,20,0.35)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{s.name}</div>
              <div style={{ color: "var(--ms-muted)", fontSize: 13, lineHeight: 1.4 }}>
                {s.series ? <div>{s.series}</div> : null}
                {s.releaseDate ? <div>Release: {s.releaseDate}</div> : null}
                {typeof s.total === "number" ? <div>Total: {s.total}</div> : null}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
