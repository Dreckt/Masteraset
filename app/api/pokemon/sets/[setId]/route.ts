import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: { setId: string } }
) {
  const apiKey = process.env.POKEMONTCG_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  const upstream = `https://api.pokemontcg.io/v2/sets/${encodeURIComponent(params.setId)}`;

  // Give it enough time for cold-start / slow upstream
  const controller = new AbortController();
  const timeoutMs = 20000; // 20s
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(upstream, {
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(t);

    const text = await res.text();

    if (!res.ok) {
      // Pass upstream error through (but safely)
      return NextResponse.json(
        {
          error: "Upstream PokemonTCG error",
          status: res.status,
          bodyPreview: text.slice(0, 200),
        },
        { status: res.status }
      );
    }

    // Small cache helps a ton (sets don't change often)
    return new NextResponse(text, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "public, max-age=300", // 5 minutes
      },
    });
  } catch (err: any) {
    clearTimeout(t);

    // Distinguish timeout vs other errors
    const isAbort =
      err?.name === "AbortError" ||
      String(err?.message ?? "").toLowerCase().includes("aborted");

    if (isAbort) {
      return NextResponse.json(
        {
          error: "Upstream request timed out (aborted)",
          upstream,
          timeoutMs,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: err?.message ?? "Unknown error",
        upstream,
      },
      { status: 500 }
    );
  }
}
