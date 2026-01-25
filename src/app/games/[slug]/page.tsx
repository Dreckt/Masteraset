import { getEnv } from "@/lib/cloudflare";

export const runtime = "edge";

export default async function GameSetsPage({ params }: { params: { slug: string } }) {
  const env = getEnv();
const game = (await env.DB
  .prepare("SELECT id, name FROM games WHERE slug = ?")
  .bind(params.slug)
  .first()) as any;

  const { results } = await env.DB.prepare(
    "SELECT id, name, code, release_date FROM sets WHERE game_id = ? ORDER BY release_date DESC, name ASC"
  ).bind(game.id).all();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>{game.name} Sets</h2>
      {results.length === 0 ? <p>No sets yet.</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {results.map((s: any) => (
            <a key={s.id} href={`/sets/${s.id}`} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, textDecoration: "none", color: "#111" }}>
              <div style={{ fontWeight: 700 }}>{s.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{s.code ?? ""}{s.release_date ? ` • ${s.release_date}` : ""}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
