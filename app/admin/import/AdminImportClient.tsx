"use client";

import { useMemo, useState } from "react";

type ImportType = "sets" | "cards";

export default function AdminImportClient() {
  const [importType, setImportType] = useState<ImportType>("cards");

  const endpoint = useMemo(() => {
    return importType === "sets" ? "/api/admin/import/sets" : "/api/admin/import/cards";
  }, [importType]);

  const formatHelp = useMemo(() => {
    if (importType === "sets") {
      return `Sets CSV (Required):
game_slug,id,name

Optional:
code,release_date,total_cards,default_language

Example:
pokemon,base1,Base Set,base1,1999-01-09,102,en

Note:
game_slug must match games.slug (pokemon, weiss, mtg, lorcana, one-piece).`;
    }
    return `Cards CSV (Required):
game_slug,set_name,card_id,card_name

Optional:
rarity,year,image_source,image_filename

Example:
pokemon,Base Set,base1-004,Charizard,Rare,1999,,pokemon_base1_004.png

Images:
If image_filename is provided, the site path becomes:
  /cards/<game_slug>/<image_filename>`;
  }, [importType]);

  return (
    <div className="ms-container">
      <div className="ms-panel" style={{ padding: 22 }}>
        <div className="ms-h2">
          Admin <span className="ms-accent-pink">CSV Import</span>
        </div>

        <div className="ms-muted" style={{ marginTop: 8, maxWidth: 860 }}>
          Admin-only tools to import CSV into D1. This page is not linked anywhere. Import requires the admin token.
        </div>

        <div className="ms-divider" style={{ marginTop: 16, marginBottom: 16 }} />

        {/* Import type selector */}
        <div className="ms-card" style={{ padding: 16, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>Import Type</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`ms-btn ${importType === "cards" ? "ms-btn-pink" : "ms-btn-ghost"}`}
              onClick={() => setImportType("cards")}
            >
              Cards CSV
            </button>

            <button
              type="button"
              className={`ms-btn ${importType === "sets" ? "ms-btn-pink" : "ms-btn-ghost"}`}
              onClick={() => setImportType("sets")}
            >
              Sets CSV
            </button>
          </div>

          <div className="ms-muted" style={{ fontSize: 13 }}>
            Posting to: <span style={{ color: "var(--ms-text)" }}>{endpoint}</span>
          </div>
        </div>

        <div style={{ height: 12 }} />

        {/* Format instructions */}
        <div className="ms-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>CSV Format</div>
          <div className="ms-muted" style={{ whiteSpace: "pre-wrap" }}>
            {formatHelp}
          </div>
        </div>

        <div style={{ height: 12 }} />

        {/* Upload form */}
        <div className="ms-card" style={{ padding: 16 }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();

              const form = e.currentTarget as HTMLFormElement;
              const tokenInput = form.querySelector<HTMLInputElement>('input[name="token"]');
              const fileInput = form.querySelector<HTMLInputElement>('input[name="file"]');

              const token = tokenInput?.value?.trim() || "";
              const file = fileInput?.files?.[0];

              if (!token) return alert("Enter admin token");
              if (!file) return alert("Choose a CSV file");

              const text = await file.text();

              const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "content-type": "text/csv",
                  "x-admin-token": token,
                },
                body: text,
              });

              const j = await res.json().catch(() => ({}));

              if (!res.ok) return alert(`Import failed: ${j?.error || res.status}`);

              alert(`Import OK. Upserts: ${j?.upserts ?? "?"}`);
            }}
          >
            <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
              <label className="ms-muted">Admin Token</label>
              <input
                name="token"
                type="password"
                placeholder="Paste admin token here"
                style={{
                  width: "100%",
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.25)",
                  color: "var(--ms-text)",
                }}
              />

              <label className="ms-muted" style={{ marginTop: 8 }}>
                CSV File
              </label>
              <input
                name="file"
                type="file"
                accept=".csv,text/csv"
                style={{
                  width: "100%",
                  padding: "10px 0px",
                  color: "var(--ms-muted)",
                }}
              />

              <button className="ms-btn ms-btn-pink" type="submit" style={{ marginTop: 10 }}>
                Import Selected CSV
              </button>

              <div className="ms-muted" style={{ fontSize: 13 }}>
                Tip: your templates live in <code>imports/sets.csv</code> and <code>imports/cards.csv</code>
              </div>
            </div>
          </form>
        </div>

        <div className="ms-muted" style={{ marginTop: 14, fontSize: 13 }}>
          Security: not linked anywhere + requires token.
        </div>
      </div>
    </div>
  );
}
