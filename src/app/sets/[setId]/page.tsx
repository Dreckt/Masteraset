import { getEnv } from "@/lib/cloudflare";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "edge";

type SortKey = "number" | "name" | "rarity" | "language" | "variant";

function orderBy(sort: SortKey) {
  const setOrder =
    "COALESCE(p.set_order_override, 999999999) ASC, " +
    "p.numbered_bucket ASC, " +
    "p.promo_bucket ASC, " +
    "COALESCE(p.num_value, 999999999) ASC, " +
    "COALESCE(p.num_prefix, '') ASC, " +
    "COALESCE(p.num_suffix, '') ASC, " +
    "p.rarity_rank ASC, " +
    "p.variant_rank ASC, " +
    "p.collector_number ASC";

  switch (sort) {
    case "name": return "c.name_sort ASC";
    case "rarity": return "p.rarity_rank ASC, c.name_sort ASC";
    case "language": return "p.language ASC, " + setOrder;
    case "variant": return "p.variant_rank ASC, " + setOrder;
    case "number":
    default: return setOrder;
  }
}

export default async function SetPage({ params, searchParams }: { params: { setId: string }, searchParams: any }) {
  const env = getEnv();
  const user = await getUserFromRequest();

const set = (await env.DB.prepare(
  `SELECT s.id, s.name, s.code, s.release_date, g.name AS game_name
     FROM sets s JOIN games g ON g.id = s.game_id WHERE s.id = ?`
).bind(params.setId).first()) as any;


  if (!set) return <div style={{ maxWidth: 1100, margin: "0 auto" }}><h2>Set not found</h2></div>;

  const sort = (searchParams?.sort ?? "number") as SortKey;
  const rarity = (searchParams?.rarity ?? "") as string;
  const language = (searchParams?.language ?? "") as string;
  const variant = (searchParams?.variant ?? "") as string;
  const q = (searchParams?.q ?? "") as string;

  const where: string[] = ["p.set_id = ?"];
  const binds: any[] = [params.setId];

  if (rarity) { where.push("p.rarity = ?"); binds.push(rarity); }
  if (language) { where.push("p.language = ?"); binds.push(language); }
  if (variant) { where.push("p.variant = ?"); binds.push(variant); }
  if (q) { where.push("(c.canonical_name LIKE ? OR p.collector_number LIKE ?)"); binds.push(`%${q}%`, `%${q}%`); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const query = `
    SELECT p.id AS printing_id, p.collector_number, p.language, p.rarity, p.variant,
           c.canonical_name,
           COALESCE(ui.qty, 0) AS owned_qty
    FROM printings p
    JOIN cards c ON c.id = p.card_id
    LEFT JOIN user_items ui ON ui.printing_id = p.id AND ui.user_id = ?
    ${whereSql}
    ORDER BY ${orderBy(sort)}
    LIMIT 500
  `;
  const binds2 = [user?.id ?? "__anon__", ...binds];
  const { results } = await env.DB.prepare(query).bind(...binds2).all();

const rarityOptions = await env.DB.prepare(
  `SELECT rarity, MIN(rarity_rank) AS rarity_rank
   FROM printings
   WHERE set_id = ?
   GROUP BY rarity
   ORDER BY rarity_rank ASC`
).bind(params.setId).all();

  const langOptions = await env.DB.prepare("SELECT DISTINCT language FROM printings WHERE set_id = ? ORDER BY language ASC").bind(params.setId).all();
  const variantOptions = await env.DB.prepare("SELECT DISTINCT variant FROM printings WHERE set_id = ? ORDER BY variant_rank ASC").bind(params.setId).all();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{set.game_name}: {set.name}</h2>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {set.code ? set.code : ""}{set.release_date ? ` • ${set.release_date}` : ""}
        </span>
      </div>

      <form style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <input name="q" defaultValue={q} placeholder="Search name or number…" style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10, minWidth: 220 }} />

        <select name="sort" defaultValue={sort} style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10 }}>
          <option value="number">Sort: Card #</option>
          <option value="name">Sort: A–Z</option>
          <option value="rarity">Sort: Rarity</option>
          <option value="language">Sort: Language</option>
          <option value="variant">Sort: Variant</option>
        </select>

        <select name="rarity" defaultValue={rarity} style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10 }}>
          <option value="">All rarities</option>
          {rarityOptions.results.map((r: any) => <option key={r.rarity} value={r.rarity}>{r.rarity}</option>)}
        </select>

        <select name="language" defaultValue={language} style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10 }}>
          <option value="">All languages</option>
          {langOptions.results.map((l: any) => <option key={l.language} value={l.language}>{l.language}</option>)}
        </select>

        <select name="variant" defaultValue={variant} style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 10 }}>
          <option value="">All variants</option>
          {variantOptions.results.map((v: any) => <option key={v.variant} value={v.variant}>{v.variant}</option>)}
        </select>

        <button type="submit" style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 10, background: "white" }}>
          Apply
        </button>

        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
          {user ? `Logged in as ${user.email}` : <span><a href="/login">Login</a> to track quantities</span>}
        </div>
      </form>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px 110px 140px 180px", padding: "10px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #eee", background: "#fafafa" }}>
          <div>Card #</div>
          <div>Name</div>
          <div>Rarity</div>
          <div>Lang</div>
          <div>Variant</div>
          <div>Owned</div>
        </div>

        {results.map((row: any) => (
          <div key={row.printing_id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px 110px 140px 180px", padding: "10px 12px", borderBottom: "1px solid #f2f2f2", alignItems: "center" }}>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{row.collector_number}</div>
            <div>{row.canonical_name}</div>
            <div>{row.rarity}</div>
            <div>{row.language}</div>
            <div>{row.variant}</div>
            <div>
              {user ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <form action="/api/me/items" method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="printing_id" value={row.printing_id} />
                    <input type="hidden" name="delta" value="-1" />
                    <button style={{ border: "1px solid #ddd", borderRadius: 10, padding: "4px 10px", background: "white" }} disabled={row.owned_qty <= 0}>-</button>
                  </form>
                  <span style={{ minWidth: 26, textAlign: "center" }}>{row.owned_qty}</span>
                  <form action="/api/me/items" method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="printing_id" value={row.printing_id} />
                    <input type="hidden" name="delta" value="1" />
                    <button style={{ border: "1px solid #ddd", borderRadius: 10, padding: "4px 10px", background: "white" }}>+</button>
                  </form>
                </div>
              ) : (
                <span style={{ fontSize: 12, opacity: 0.7 }}>—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
