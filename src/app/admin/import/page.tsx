"use client";

import { useMemo, useState } from "react";

type ImportType = "cards" | "sets" | "printings";

export default function AdminImportPage() {
  const [token, setToken] = useState("");
  const [importType, setImportType] = useState<ImportType>("cards");
  const [file, setFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(() => {
    return token.trim().length > 0 && !!file && !isRunning;
  }, [token, file, isRunning]);

  async function runImport() {
    setError(null);
    setResult(null);

    if (!token.trim()) {
      setError("Please enter your admin token.");
      return;
    }
    if (!file) {
      setError("Please choose a CSV file to upload.");
      return;
    }

    // This implementation supports Cards right now (your Base Set import)
    if (importType !== "cards") {
      setError(
        "This upload importer is currently enabled for Cards only. (Sets/Printings can be added next.)"
      );
      return;
    }

    setIsRunning(true);
    try {
      const fd = new FormData();
      fd.append("token", token.trim());
      fd.append("type", importType);
      fd.append("file", file);

      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: fd,
      });

      const contentType = res.headers.get("content-type") || "";
      const payload: any = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg =
          typeof payload === "string"
            ? payload
            : payload?.error || payload?.message || "Import failed.";
        throw new Error(msg);
      }

      setResult(payload);
    } catch (e: any) {
      setError(e?.message || "Import failed.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Admin Import</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Upload a CSV and import it into D1. (This page is intentionally not
        linked from the homepage.)
      </p>

      <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-black/30 p-6 shadow">
        <div className="space-y-2">
          <label className="text-sm font-medium">Admin token</label>
          <input
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste ADMIN_TOKEN"
            autoComplete="off"
          />
          <p className="text-xs text-neutral-500">
            Must match the{" "}
            <code className="rounded bg-white/10 px-1 py-0.5">ADMIN_TOKEN</code>{" "}
            secret in Cloudflare Pages.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-medium">Import type</label>
            <select
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-white/20"
              value={importType}
              onChange={(e) => setImportType(e.target.value as ImportType)}
            >
              <option value="cards">Cards</option>
              <option value="sets">Sets (disabled)</option>
              <option value="printings">Printings (disabled)</option>
            </select>
            <p className="text-xs text-neutral-500">
              Upload importer enabled for <strong>Cards</strong> first.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">CSV file</label>
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-white/20"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-neutral-500">
              Example:{" "}
              <code className="rounded bg-white/10 px-1 py-0.5">
                masteraset_cards_base_set_filled.csv
              </code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runImport}
            disabled={!canRun}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? "Importing…" : "Run Import"}
          </button>

          {isRunning ? (
            <span className="text-sm text-neutral-400">Running import…</span>
          ) : (
            <span className="text-sm text-neutral-500">
              Tip: keep this page open until you see results.
            </span>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <div className="font-semibold">Import complete</div>
            <div className="mt-2 grid gap-1 text-xs text-emerald-100/90">
              <div>
                <span className="opacity-80">type:</span> {result.type}
              </div>
              <div>
                <span className="opacity-80">parsed rows:</span>{" "}
                {result.parsedRows}
              </div>
              <div>
                <span className="opacity-80">inserted:</span> {result.inserted}
              </div>
              <div>
                <span className="opacity-80">skipped:</span> {result.skipped}
              </div>
            </div>

            {result.errors?.length ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold">
                  View errors ({result.errors.length})
                </summary>
                <pre className="mt-2 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-emerald-100/90">
                  {JSON.stringify(result.errors, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-10 text-xs text-neutral-500">
        <div className="font-semibold text-neutral-400">
          Cards CSV required columns
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <code className="rounded bg-white/10 px-1 py-0.5">game_id</code>{" "}
            (required)
          </li>
          <li>
            <code className="rounded bg-white/10 px-1 py-0.5">
              canonical_name
            </code>{" "}
            (required)
          </li>
          <li>
            <code className="rounded bg-white/10 px-1 py-0.5">name_sort</code>{" "}
            (required)
          </li>
          <li>
            All other columns are optional (set_name, card_id, card_name, rarity,
            year, image_*).
          </li>
        </ul>
      </div>
    </div>
  );
}
