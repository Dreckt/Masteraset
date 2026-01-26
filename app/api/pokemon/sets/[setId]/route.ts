import { NextResponse } from "next/server";

export const runtime = "edge";

type PokemonSet = {
  id: string;
  name: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string;
  updatedAt?: string;
  images?: { symbol?: string; logo?: string };
};

export async function GET(
  _req: Request,
  { params }: { params: { setId: string } }
) {
  const apiKey = process.env.POKEMONTCG_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  const upstream = "https://api.pokemontcg.io/v2/sets";

  const controller = new AbortController();
  const timeoutMs = 20000;
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
      return NextResponse.json(
        {
          error: "Upstream PokemonTCG error (sets list)",
          status: res.status,
          bodyPreview: text.slice(0, 200),
        },
        { status: res.status }
      );
    }

    const json = JSON.parse(text) as { data?: PokemonSet[] };
    const set = (json.data ?? []).find((s) => s.id === params.setId);

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    return NextResponse.json(
      { data: set },
      {
        status: 200,
        headers: {
          // Cache helps a lot; list changes rarely
          "cache-control": "public, max-age=600", // 10 minutes
        },
      }
    );
  } catch (err: any) {
    clearTimeout(t);

    const isAbort =
      err?.name === "AbortError" ||
      String(err?.message ?? "").toLowerCase().includes("aborted");

    if (isAbort) {
      return NextResponse.json(
        {
          error: "Upstream sets list timed out (aborted)",
          upstream,
          timeoutMs,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Unknown error", upstream },
      { status: 500 }
    );
  }
}
