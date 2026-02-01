import { headers } from "next/headers";

export const runtime = "edge";

type CardRow = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_small: string | null;
  image_large: string | null;
};

function getOriginFromHeaders() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "masteraset.com";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export default async function CardsGrid({ setId }: { setId: string }) {
  const origin = getOriginFromHeaders();

  const res = await fetch(`${origin}/api/pokemon/cards?setId=${encodeURIComponent(setId)}`, {
    headers: { accept: "application/json" },
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          background: "rgba(11,14,20,0.35)",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Couldn’t load cards</div>
        <pre
          style={{
            margin: 0,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {JSON.stringify({ status: res.status, payload }, null, 2)}
        </pre>
      </div>
    );
  }

  const rows = (payload?.data ?? []) as CardRow[];

  if (rows.length === 0) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          background: "rgba(11,14,20,0.35)",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>No cards loaded yet</div>
        <div style={{ color: "var(--ms-muted)" }}>Import cards for this set using your admin/CSV import flow.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        gap: 12,
      }}
    >
      {rows.map((c) => (
        <a
          key={c.id}
          href={`/pokemon/cards/${encodeURIComponent(c.id)}`}
          style={{
            display: "block",
            padding: 12,
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(11,14,20,0.35)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6, lineHeight: 1.15 }}>{c.name}</div>

          <div style={{ color: "var(--ms-muted)", fontSize: 12, lineHeight: 1.3 }}>
            {c.number ? <div>No. {c.number}</div> : null}
            {c.rarity ? <div>{c.rarity}</div> : null}
          </div>

          {c.image_small ? (
            <div style={{ marginTop: 10 }}>
              <img
                src={c.image_small}
                alt={c.name}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(0,0,0,0.2)",
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div
              style={{
                marginTop: 10,
                height: 210,
                borderRadius: 12,
                border: "1px dashed rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ms-muted)",
                fontSize: 12,
              }}
            >
              No image
            </div>
          )}
        </a>
      ))}
    </div>
  );
}
