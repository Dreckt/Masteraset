// src/app/pokemon/sets/page.tsx
import Link from "next/link";
import { headers } from "next/headers";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type PokemonSetRow = {
  id: string;
  name: string;
  series?: string | null;
  releaseDate?: string | null;
  total?: number | null;
  printedTotal?: number | null;
  images?: {
    symbol?: string | null;
    logo?: string | null;
  } | null;
};

type SetsApiResponse = {
  data?: PokemonSetRow[];
  count?: number;
  source?: string;
  error?: string;
};

function getOriginFromHeaders(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "masteraset.com";
  return `${proto}://${host}`;
}

export default async function PokemonSetsPage() {
  const origin = getOriginFromHeaders();

  // IMPORTANT: Do NOT pass { cache: "no-store" } here.
  // Cloudflare Pages/Workers throws: "RequestInitializerDict.cache is not implemented"
  const res = await fetch(`${origin}/api/pokemon/sets`);

  if (!res.ok) {
    throw new Error(`Failed to load Pokemon sets: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as SetsApiResponse;
  const sets = Array.isArray(json.data) ? json.data : [];

  return (
    <div className="ms-container" style={{ paddingTop: 18, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Pokémon Sets</h1>
          <p style={{ marginTop: 8, marginBottom: 0, color: "var(--ms-muted)" }}>
            Loaded from: <span className="ms-chip">{json.source ?? "unknown"}</span>{" "}
            <span className="ms-chip">{sets.length} sets</span>
          </p>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {sets.length === 0 ? (
          <div className="ms-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700 }}>No sets found</div>
            <div style={{ marginTop: 6, color: "var(--ms-muted)" }}>
              Your DB/API returned an empty list.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {sets.map((s) => (
              <Link
                key={s.id}
                href={`/pokemon/sets/${encodeURIComponent(s.id)}`}
                className="ms-card"
                style={{ display: "block", padding: 14, textDecoration: "none" }}
              >
                <div style={{ fontWeight: 800 }}>{s.name}</div>
                <div style={{ marginTop: 6, color: "var(--ms-muted)", fontSize: 13 }}>
                  <div>Set ID: {s.id}</div>
                  {s.series ? <div>Series: {s.series}</div> : null}
                  {s.releaseDate ? <div>Release: {s.releaseDate}</div> : null}
                  {typeof s.total === "number" ? <div>Total cards: {s.total}</div> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

