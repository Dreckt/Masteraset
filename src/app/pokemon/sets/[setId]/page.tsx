import { headers } from "next/headers";
import CardsGrid from "./CardsGrid";

export const runtime = "edge";

type PokemonSet = {
  id: string;
  name: string;
  series: string | null;
  releaseDate: string | null;
  printedTotal: number | null;
  total: number | null;
  images: { symbol: string | null; logo: string | null };
  updatedAt: string | null;
};

type SetApiResponse = {
  data?: PokemonSet;
  source?: string;
  count?: number;
  error?: string;
  message?: string;
};

function getOriginFromHeaders() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "masteraset.com";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export default async function PokemonSetPage({
  params,
}: {
  params: { setId: string };
}) {
  const origin = getOriginFromHeaders();
  const setId = params.setId;

  const res = await fetch(`${origin}/api/pokemon/sets/${encodeURIComponent(setId)}`, {
    headers: { accept: "application/json" },
  });

  const payload = (await res.json().catch(() => null)) as SetApiResponse | PokemonSet | null;

  if (!res.ok) {
    return (
      <main className="ms-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Pokémon Set</h1>
        <p style={{ color: "var(--ms-muted)" }}>
          Couldn’t load set <code>{setId}</code>.
        </p>
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

  // API returns { data: {...} } but we also accept a direct object (defensive)
  const set = (payload && "data" in payload ? (payload as SetApiResponse).data : payload) as PokemonSet | null;

  return (
    <main className="ms-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ color: "var(--ms-muted)", fontSize: 13, marginBottom: 6 }}>
            Pokémon • Sets
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>{set?.name ?? setId}</h1>
          <div style={{ color: "var(--ms-muted)", marginTop: 6, fontSize: 13, lineHeight: 1.4 }}>
            {set?.series ? <span style={{ marginRight: 10 }}>{set.series}</span> : null}
            {set?.releaseDate ? <span style={{ marginRight: 10 }}>Release: {set.releaseDate}</span> : null}
            {typeof set?.total === "number" ? <span>Total: {set.total}</span> : null}
          </div>
        </div>

        <a
          className="ms-chip"
          href="/pokemon/sets"
          style={{ textDecoration: "none", color: "inherit", whiteSpace: "nowrap" }}
        >
          ← Back to sets
        </a>
      </div>

      <div style={{ marginTop: 18 }}>
        <CardsGrid setId={setId} />
      </div>
    </main>
  );
}
