"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MeResponse = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
  } | null;
};

export default function AccountPage() {
  const [user, setUser] = useState<MeResponse["user"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resp = await fetch("/api/auth/me", { method: "GET" });
        const data = (await resp.json().catch(() => ({}))) as MeResponse;

        if (!cancelled) setUser(data?.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 26, margin: 0 }}>Account</h1>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/">Home</Link>
          <Link href="/me">Me</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </div>

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading…</p>
      ) : user ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            <strong>Signed in</strong>
          </p>
          <p style={{ marginTop: 8, marginBottom: 0 }}>
            {user.name ? <span>{user.name}</span> : null}
            {user.email ? (
              <>
                {user.name ? " — " : null}
                <span>{user.email}</span>
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            <strong>Not signed in</strong>
          </p>
          <p style={{ marginTop: 8 }}>
            If you expected to be signed in, make sure <code>/api/auth/me</code> returns JSON like{" "}
            <code>{"{ user: {...} }"}</code>.
          </p>
          <p style={{ marginTop: 8 }}>
            <Link href="/login">Go to login</Link>
          </p>
        </div>
      )}
    </div>
  );
}
