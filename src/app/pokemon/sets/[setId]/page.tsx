import Link from "next/link";
import { headers } from "next/headers";

export const runtime = "edge";

type PokemonSet = {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  printedTotal?: number | null;
  total?: number | null;
  images?: {
    symbol?: string | null;
    logo?: string | null;
  };
};

function getOriginFromHeaders(): string {
  const h = headers();
  const xfProto = h.get("x-forwarded-proto");
  const host = h.get("host");

  if (host) {
    const proto = xfProto || "https";
    return `${proto}://${host}`;
  }

  return "https://masteraset.com";
}

export default async function PokemonSetPage({
  params,
}: {
  params: { setId: string };
}) {
  const origin = getOriginFromHeaders();
  const setId = params.setId;

  // IMPORTANT: Do NOT use fetch({ cache: ... }) on Cloudflare Workers (not implemented)
  const res = await fetch(`${origin}/api/pokemon/sets/${encodeURIComponent(setId)}`);

  if (!res.ok) {
    throw new Error(
      `Failed to load set ${setId}. Status: ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as { data?: PokemonSet };
  const set = json.data;

  if (!set) {
    throw new Error(`No data returned for set: ${setId}`);
  }

  return (
    <main className="ms-container" style={{ paddingTop: 18, paddingBottom: 40 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/pokemon" className="ms-link">
          Pokémon
        </Link>
        <span style={{ opacity: 0.5 }}>›</span>
        <Link href="/pokemon/sets" className="ms-link">
          Sets
        </Link>
        <span style={{ opacity: 0.5 }}>›</span>
        <span style={{ opacity: 0.85 }}>{set.name}</span>
      </div>

      <div style={{ marginTop: 14 }}>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>
          {set.name}
        </h1>

        <div style={{ marginTop: 8, opacity: 0.8 }}>
          <span>{set.series ?? "—"}</span>
          {set.releaseDate ? (
            <>
              <span style={{ opacity: 0.5 }}> • </span>
              <span>{set.releaseDate}</span>
            </>
          ) : null}
        </div>

        <div style={{ marginTop: 10, opacity: 0.75 }}>
          Total cards: {set.total ?? "—"}
          <span style={{ opacity: 0.5 }}> • </span>
          Printed total: {set.printedTotal ?? "—"}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Next</div>
        <div style={{ opacity: 0.8 }}>
          Cards grid for this set comes next — once the cards endpoint is wired
          up to D1 (or your chosen source).
        </div>
      </div>
    </main>
  );
}

