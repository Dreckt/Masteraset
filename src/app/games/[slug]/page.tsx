import { getEnv } from "@/lib/cloudflare";
import Link from "next/link";

export const runtime = "edge";

export default async function GameSetsPage({
  params,
}: {
  params: { slug: string };
}) {
  const env = getEnv();

  const game = (await env.DB.prepare(
    "SELECT id, name, slug FROM games WHERE slug = ?"
  )
    .bind(params.slug)
    .first()) as any;

  if (!game) {
    return (
      <div className="ms-container">
        <div className="ms-panel" style={{ padding: 22 }}>
          <div className="ms-h2">Game not found</div>
          <div className="ms-muted" style={{ marginTop: 8 }}>
            No game exists with slug:{" "}
            <span className="ms-accent-cyan">{params.slug}</span>
          </div>

          <div style={{ marginTop: 16 }}>
            <Link className="ms-btn" href="/games">
              ← Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { results } = await env.DB.prepare(
    "SELECT id, name, code, release_date FROM sets WHERE game_id = ? ORDER BY release_date DESC, name ASC"
  )
    .bind(game.id)
    .all();

  return (
    <div className="ms-container">
      <div className="ms-panel" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="ms-h2">
              {game.name} <span className="ms-accent-cyan">Sets</span>
            </div>
            <div className="ms-muted" style={{ marginTop: 6 }}>
              Browse sets stored in your D1 database for this game.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="ms-btn" href="/games">
              ← Games
            </Link>
            <Link className="ms-btn" href="/dashboard">
              Dashboard
            </Link>
            <Link className="ms-btn" href="/admin/import">
              Admin Import
            </Link>
          </div>
        </div>

        <div className="ms-divider" style={{ marginTop: 16, marginBottom: 16 }} />

        {results.length === 0 ? (
          <div className="ms-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No sets yet</div>
            <div className="ms-muted" style={{ marginTop: 8 }}>
              Import sets for this game in Admin Import, then come back here.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {results.map((s: any) => (
              <Link
                key={s.id}
                className="ms-card"
                href={`/sets/${s.id}`}
                style={{ padding: 16 }}
              >
                <div style={{ fontWeight: 900, fontSize: 16 }}>{s.name}</div>
                <div className="ms-muted" style={{ marginTop: 8, fontSize: 12 }}>
                  {(s.code ?? "").toString()}
                  {s.release_date ? ` • ${s.release_date}` : ""}
                </div>
                <div className="ms-muted" style={{ marginTop: 12 }}>
                  <span className="ms-accent-cyan">→</span> View set
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
