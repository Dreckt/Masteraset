import { getEnv } from "@/lib/cloudflare";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "edge";

export default async function MePage() {
  const env = getEnv();
  const user = await getUserFromRequest();
  if (!user) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2>My Collection</h2>
        <p>You’re not logged in yet.</p>
        <a href="/login" style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, textDecoration: "none", color: "#111" }}>Login</a>
      </div>
    );
  }

  // Simple progress: owned qty>0 per set / total printings per set
  const { results } = await env.DB.prepare(
    `SELECT s.id as set_id, s.name as set_name, g.name as game_name,
            SUM(CASE WHEN ui.qty > 0 THEN 1 ELSE 0 END) as owned_printings,
            COUNT(p.id) as total_printings
     FROM sets s
     JOIN games g ON g.id = s.game_id
     JOIN printings p ON p.set_id = s.id
     LEFT JOIN user_items ui ON ui.user_id = ? AND ui.printing_id = p.id
     GROUP BY s.id
     ORDER BY g.name ASC, s.name ASC`
  ).bind(user.id).all();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>My Collection</h2>
      <p style={{ opacity: 0.8 }}>Signed in as <b>{user.email}</b></p>

      {results.length === 0 ? (
        <p>No sets loaded yet. Seed sample data from the home page, then come back.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {results.map((r: any) => {
            const pct = r.total_printings ? Math.round((r.owned_printings / r.total_printings) * 100) : 0;
            return (
              <a key={r.set_id} href={`/sets/${r.set_id}`} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, textDecoration: "none", color: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.game_name}: {r.set_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{r.owned_printings}/{r.total_printings} printings owned</div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{pct}%</div>
                </div>
                <div style={{ marginTop: 8, height: 8, background: "#f2f2f2", borderRadius: 999 }}>
                  <div style={{ width: `${pct}%`, height: 8, background: "#111", borderRadius: 999 }} />
                </div>
              </a>
            );
          })}
        </div>
      )}

      <form action="/api/auth/logout" method="post" style={{ marginTop: 18 }}>
        <button style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, background: "white" }}>
          Logout
        </button>
      </form>
    </div>
  );
}
