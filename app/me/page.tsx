import { headers } from "next/headers";
import Link from "next/link";

// Cloudflare build can't resolve the "@/..." alias reliably here,
// and your helpers are not under /src in this build context.
// Use root-level relative imports instead.
import { getEnv } from "../../lib/env";
import { getUserFromRequest } from "../../lib/auth";

export const runtime = "edge";

export default async function MePage() {
  const env = getEnv();

  // Server Components don't receive a Pages "ctx" object.
  // Build a Request that includes cookies so auth can read the session.
  const h = headers();
  const reqForAuth = new Request("https://internal/me", {
    headers: {
      cookie: h.get("cookie") ?? "",
    },
  });

  const user = await getUserFromRequest({
    env: { DB: env.DB },
    request: reqForAuth,
  });

  if (!user) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>You’re not signed in</h1>
        <p style={{ marginBottom: 16 }}>Please sign in to view your account.</p>
        <Link href="/login">Go to Login</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>My Account</h1>

      <div style={{ marginBottom: 18 }}>
        <div>
          <strong>User ID:</strong> {user.id}
        </div>
        {user.email ? (
          <div>
            <strong>Email:</strong> {user.email}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/sets">Sets</Link>
        <Link href="/pokemon/sets">Pokémon Sets</Link>
        <Link href="/api/auth/logout">Logout</Link>
      </div>
    </div>
  );
}
