export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.POKEMONTCG_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key missing" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId");
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("pageSize") ?? "50";

  if (!setId) {
    return NextResponse.json({ error: "Missing setId" }, { status: 400 });
  }

  const upstream = new URL("https://api.pokemontcg.io/v2/cards");
  upstream.searchParams.set("q", `set.id:${setId}`);
  upstream.searchParams.set("page", page);
  upstream.searchParams.set("pageSize", pageSize);

  const res = await fetch(upstream.toString(), {
    headers: { "X-Api-Key": apiKey },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
