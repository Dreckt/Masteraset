export const runtime = "edge";

export default function LoginPage({ searchParams }: { searchParams: any }) {
  const sent = searchParams?.sent === "1";
  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2>Login</h2>
      <p>Enter your email to receive a magic link.</p>
      {sent && <p style={{ padding: 10, border: "1px solid #ddd", borderRadius: 10 }}>If email sending is configured, a login link was sent.</p>}
      <form action="/api/auth/start" method="post" style={{ display: "grid", gap: 10 }}>
        <input name="email" type="email" required placeholder="you@example.com" style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10 }} />
        <button style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10, background: "white" }}>
          Send magic link
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.75 }}>
        Dev note: Email sending is stubbed. Once you add an email provider key, the magic link flow becomes fully functional.
      </p>
    </div>
  );
}
