// src/app/pokemon/cards/[cardId]/page.tsx
import Link from "next/link";

export const runtime = "edge";

type CardRow = {
  id: string;
  canonical_name: string;
  name_sort: string | null;
  set_name: string | null;
  card_id: string | null;
  card_name: string | null;
  rarity: string | null;
  year: number | null;
  image_source: string | null;
  image_filename: string | null;
  image_path: string | null;
};

type ApiResponse =
  | { ok: true; data: CardRow }
  | { ok: false; error: string };

function getOriginFromHeaders(): string {
  // In Edge runtime, we can safely read forwarded host/proto headers.
  // If these headers aren't present for some reason, fall back to empty and let fetch use absolute URL built from request.
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

async function fetchCard(cardId: string): Promise<ApiResponse> {
  const origin = getOriginFromHeaders();

  // Always use absolute URL in Cloudflare/Edge to avoid "Invalid URL: /api/..."
  const url = origin
    ? `${origin}/api/pokemon/cards/${encodeURIComponent(cardId)}`
    : `https://masteraset.com/api/pokemon/cards/${encodeURIComponent(cardId)}`;

  const res = await fetch(url, {
    // DO NOT pass `cache:` on Cloudflare Workers (not implemented)
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      error: `HTTP ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`,
    };
  }

  const json = (await res.json().catch(() => null)) as any;
  // Your API shape may be { data: {...} } or { ok: true, data: {...} }
  const data: CardRow | undefined = json?.data;

  if (!data?.canonical_name) {
    return { ok: false, error: "Malformed response from /api/pokemon/cards/[cardId]" };
  }

  return { ok: true, data };
}

export default async function PokemonCardPage({
  params,
}: {
  params: { cardId: string };
}) {
  const cardId = params.cardId;

  const result = await fetchCard(cardId);

  if (!result.ok) {
    return (
      <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          Error loading card
        </h1>
        <p style={{ marginBottom: 16, whiteSpace: "pre-wrap" }}>{result.error}</p>
        <Link href="/pokemon/sets" style={{ textDecoration: "underline" }}>
          Back to sets
        </Link>
      </main>
    );
  }

  const card = result.data;
  const title = card.card_name || card.card_id || card.canonical_name;

  // We will render image_path directly (CDN url) if present
  const imageUrl = card.image_path || null;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/pokemon/sets" style={{ textDecoration: "underline" }}>
          ← Back to sets
        </Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        {title}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}>
        <section
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          {imageUrl ? (
            // Using plain <img> avoids next/image remote config headaches for now
            <img
              src={imageUrl}
              alt={title}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 10,
                display: "block",
              }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "2.5 / 3.5",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                color: "rgba(255,255,255,0.7)",
                fontSize: 14,
              }}
            >
              No image available
            </div>
          )}

          {imageUrl ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              Source: {card.image_source || "unknown"}
            </div>
          ) : null}
        </section>

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <Row label="Set" value={card.set_name || "—"} />
            <Row label="Card ID" value={card.card_id || "—"} />
            <Row label="Rarity" value={card.rarity || "—"} />
            <Row label="Year" value={card.year != null ? String(card.year) : "—"} />
            <Row label="Canonical" value={card.canonical_name} />
          </div>

          {imageUrl ? (
            <div style={{ marginTop: 14 }}>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "underline" }}
              >
                Open image
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
      <div style={{ opacity: 0.75 }}>{label}</div>
      <div style={{ wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
