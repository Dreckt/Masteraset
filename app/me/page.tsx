import Link from "next/link";

export const runtime = "edge";

export default async function MePage() {
  // Temporary build-safe page:
  // Cloudflare Pages build is currently failing to resolve shared modules (env/auth)
  // from this /app directory. This keeps deploys unblocked.
  //
  // Once the repo is cleaned up so the build uses /src/app consistently (or path alias works),
  // we can restore auth-backed /me.

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>My Account</h1>

      <p style={{ marginBottom: 16 }}>
        This page is temporarily running in “build-safe” mode while we resolve Cloudflare Pages
        module resolution for shared auth/env helpers.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/login">Login</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/sets">Sets</Link>
        <Link href="/pokemon/sets">Pokémon Sets</Link>
      </div>

      <div style={{ marginTop: 18, fontSize: 13, opacity: 0.7 }}>
        Note: once routing is standardized (likely moving everything to <code>src/app</code>),
        we’ll re-enable session-based user display here.
      </div>
    </div>
  );
}
