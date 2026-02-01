export const runtime = "edge";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getUserFromRequest } from "@/lib/auth";

type Env = { DB: D1Database };

export default async function MePage() {
  const ctx = getRequestContext();
  const env = ctx.env as unknown as Env;

  const user = await getUserFromRequest({
    env: { DB: env.DB },
    request: ctx.request,
  });

  if (!user) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Sign in required</h1>
        <p style={{ marginBottom: 16 }}>You need to be signed in to view your account.</p>
        <Link href="/login" style={{ textDecoration: "underline" }}>
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>My Account</h1>

      <div style={{ padding: 16, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>User ID:</strong> {String(user.id)}
        </div>
        {user.email ? (
          <div style={{ marginBottom: 8 }}>
            <strong>Email:</strong> {String(user.email)}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Link href="/dashboard" style={{ textDecoration: "underline" }}>
          Dashboard
        </Link>
        <Link href="/games" style={{ textDecoration: "underline" }}>
          Games
        </Link>
        <Link href="/admin/import" style={{ textDecoration: "underline" }}>
          Admin Import
        </Link>
        <a href="/api/auth/logout" style={{ textDecoration: "underline" }}>
          Log out
        </a>
      </div>
    </div>
  );
}
