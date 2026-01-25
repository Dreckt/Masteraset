export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.POKEMONTCG_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  const res = await fetch("https://api.pokemontcg.io/v2/sets", {
    headers: {
      "X-Api-Key": apiKey
    }
  });

  const data = await res.json();
  return NextResponse.json(data);
}
