"use client";

import { useEffect, useMemo, useState } from "react";

function humanizeError(code: string) {
  switch (code) {
    case "invalid_link":
      return "That sign-in link is invalid.";
    case "link_used":
      return "That sign-in link has already been used.";
    case "link_expired":
      return "That sign-in link expired. Please request a new one.";
    default:
      return "";
  }
}

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const params = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    []
  );
  const errCode = params.get("error") || "";

  useEffect(() => {
    const msg = humanizeError(errCode);
    if (msg) setMessage(msg);
  }, [errCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const resp = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setStatus("error");
        setMessage(data?.error || "Failed to send link.");
        return;
      }

      setStatus("sent");
      setMessage("Check your email for a sign-in link (it expires in 15 minutes).");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Failed to send link.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm opacity-80 mt-1">Get a magic link by email. No password needed.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-sm opacity-80">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
            required
          />

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-white text-black py-2 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {message ? (
          <div className="mt-4 text-sm rounded-xl border border-white/10 bg-black/20 p-3">{message}</div>
        ) : null}

        <div className="mt-5 text-xs opacity-70">Tip: Check spam/promotions folders if you don’t see the email.</div>
      </div>
    </main>
  );
}
