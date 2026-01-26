import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const apiKey = process.env.POKEMONTCG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const url = new URL(req.url);
    const setId = url.searchParams.get("setId");
    const pageSizeRaw = url.searchParams.get("pageSize") ?? "24";
    const pageRaw = url.searchParams.get("page") ?? "1";

    if (!setId) {
      return NextResponse.json({ error: "Missing setId" }, { status: 400 });
    }

    // Clamp to safe values (PokemonTCG supports up to 250)
    const pageSize = Math.min(Math.max(parseInt(pageSizeRaw, 10) || 24, 1), 250);
    const page = Math.max(parseInt(pageRaw, 10) || 1, 1);

    const upstream = new URL("https://api.pokemontcg.io/v2/cards");
    upstream.searchParams.set("q", `set.id:${setId}`);
    upstream.searchParams.set("pageSize", String(pageSize));
    upstream.searchParams.set("page", String(page));

    // Add a timeout so requests never hang for minutes
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(upstream.toString(), {
      headers: {
        "X-Api-Key": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(t);

    const body = await res.text();

    // Pass through upstream errors but include context (helps debugging)
    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Upstream PokemonTCG request failed",
          status: res.status,
          upstream: upstream.toString(),
          bodyPreview: body.slice(0, 300),
        },
        { status: res.status }
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json; charset=utf-8",
        // you can tune caching later; for now keep it uncached
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    const msg =
      err?.name === "AbortError"
        ? "Timeout fetching from PokemonTCG API"
        : err?.message ?? String(err);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
