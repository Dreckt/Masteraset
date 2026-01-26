import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: { setId: string } }
) {
  try {
    const apiKey = process.env.POKEMONTCG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const upstream = `https://api.pokemontcg.io/v2/sets/${encodeURIComponent(params.setId)}`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(upstream, {
      headers: {
        "X-Api-Key": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(t);

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Upstream PokémonTCG error",
          status: res.status,
          upstream,
          bodyPreview: text.slice(0, 200),
        },
        { status: res.status }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load set" },
      { status: 500 }
    );
  }
}
