export const runtime = "edge";

export default function SeedPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2>Dev: Seed Sample Data</h2>
      <p>This creates sample games/sets/cards/printings in your D1 database.</p>
      <form action="/api/admin/seed" method="post">
        <button style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, background: "white" }}>
          Seed sample data
        </button>
      </form>
      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        Remove this page/route before launching publicly.
      </p>
    </div>
  );
}
