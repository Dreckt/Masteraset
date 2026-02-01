"use client";

import { useState } from "react";

type ImportJson = {
  ok?: boolean;
  error?: string;
  upserts?: number;
  detail?: string;
};

async function safeJson(res: Response): Promise<ImportJson> {
  try {
    const j = (await res.json()) as unknown;
    if (j && typeof j === "object") return j as ImportJson;
    return {};
  } catch {
    return {};
  }
}

export default function AdminImportClient() {
  const [adminToken, setAdminToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function runImport(kind: "sets" | "cards" | "printings") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/import/${kind}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(adminToken ? { "x-admin-token": adminToken } : {}),
        },
        // Server route reads CSV from /imports/*.csv, so no body required.
        body: JSON.stringify({}),
      });

      const j = await safeJson(res);

      if (!res.ok) {
        const msg = j.error || j.detail || String(res.status);
        alert(`Import failed: ${msg}`);
        return;
      }

      alert(`Import OK. Upserts: ${j.upserts ?? "?"}`);
    } catch (err: any) {
      alert(`Import failed: ${String(err?.message || err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Admin Import</h1>

      <p style={{ opacity: 0.85, marginTop: 0 }}>
        Runs server-side CSV imports from the <code>/imports</code> folder.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <label style={{ fontWeight: 600 }}>Admin token</label>
        <input
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          placeholder="x-admin-token"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.25)",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <button
          onClick={() => runImport("sets")}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Import Sets
        </button>

        <button
          onClick={() => runImport("cards")}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Import Cards
        </button>

        <button
          onClick={() => runImport("printings")}
          disabled={busy}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Import Printings
        </button>
      </div>

      {busy ? <p style={{ marginTop: 14, opacity: 0.85 }}>Running import…</p> : null}
    </div>
  );
}
