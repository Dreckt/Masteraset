import { getEnv } from "@/lib/cloudflare";

export const runtime = "edge";

export default async function GamesPage() {
  const env = getEnv();
  const { results } = await env.DB.prepare("SELECT id, name, slug FROM games ORDER BY name ASC").all();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Games</h2>
      {results.length === 0 ? (
        <p>No games yet. Use the Dev seed button on the home page or import data.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {results.map((g: any) => (
            <a key={g.id} href={`/games/${g.slug}`} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, textDecoration: "none", color: "#111" }}>
              <div style={{ fontWeight: 700 }}>{g.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{g.slug}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
