// src/app/pokemon/sets/page.tsx
import Link from "next/link";

export const runtime = "edge";

type SetRow = {
  id: string;
  name: string | null;
  series: string | null;
  total: number | null;
  printedTotal: number | null;
  releaseDate: string | null;
  images?: any;
};

function getOriginFromHeaders(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { headers } = require("next/headers") as typeof import("next/headers");
    const h = headers();
    const proto = h.get("x-forwarded-proto") || "https";
    const host = h.get("x-forwarded-host") || h.get("host");
    if (!host) return "";
    return `${proto}://${host}`;
  } catch {
    return "";
  }
}

async function fetchSets(): Promise<SetRow[]> {
  const origin = getOriginFromHeaders();

  const url = origin
    ? `${origin}/api/pokemon/sets`
    : `https://masteraset.com/api/pokemon/sets`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // IMPORTANT: Do NOT pass fetch({ cache: ... }) on Cloudflare Workers (not implemented)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  const json = (await res.json().catch(() => null)) as any;
  // expecting { data: [...] }
  return (json?.data || []) as SetRow[];
}

export default async function PokemonSetsPage() {
  let sets: SetRow[] = [];
  let error: string | null = null;

  try {
    sets = await fetchSets();
  } catch (e: any) {
    error = e?.message || String(e);
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          ← Home
        </Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
        Pokémon Sets
      </h1>

      {error ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: 14,
            whiteSpace: "pre-wrap",
          }}
        >
          Error loading sets: {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {sets.map((s) => (
          <Link
            key={s.id}
            href={`/pokemon/sets/${encodeURIComponent(s.id)}`}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 14,
              textDecoration: "none",
              display: "block",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {s.name || s.id}
            </div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              {s.series || "—"} • {s.total ?? "—"} cards • {s.releaseDate || "—"}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
