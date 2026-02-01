import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: { cardId: string } }
) {
  const apiKey = process.env.POKEMONTCG_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(params.cardId)}`;
  const res = await fetch(url, { headers: { "X-Api-Key": apiKey } });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
