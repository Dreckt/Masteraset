"use client";

import { useEffect, useState } from "react";

type User = { id: string; email: string } | null;

export default function AccountPage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    setLoading(true);
    const resp = await fetch("/api/auth/me", { method: "GET" });
    const data = await resp.json().catch(() => ({}));
    setUser(data?.user ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/signin";
  }

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold">Account</h1>

        {loading ? (
          <p className="mt-4 opacity-80">Loading…</p>
        ) : user ? (
          <>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm opacity-70">Signed in as</div>
              <div className="text-lg font-medium mt-1">{user.email}</div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => (window.location.href = "/pokemon/sets")}
                className="rounded-xl bg-white text-black px-4 py-2 font-medium hover:opacity-90"
              >
                Go to Pokémon Sets
              </button>
              <button
                onClick={logout}
                className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 font-medium hover:border-white/25"
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 opacity-80">You’re not signed in.</p>
            <div className="mt-5">
              <button
                onClick={() => (window.location.href = "/signin")}
                className="rounded-xl bg-white text-black px-4 py-2 font-medium hover:opacity-90"
              >
                Sign in
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
