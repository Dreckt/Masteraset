// src/app/api/pokemon/cards/[cardId]/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";

function json(data: any, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers || {}),
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { cardId: string } }
) {
  try {
    const cardId = params?.cardId;
    if (!cardId) {
      return json({ error: "Missing cardId" }, { status: 400 });
    }

    const apiKey = process.env.POKEMONTCG_API_KEY;
    const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardId)}`;

    const resp = await fetch(url, {
      headers: {
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
      // Edge/Workers friendly
      cf: { cacheTtl: 0, cacheEverything: false } as any,
    });

    const text = await resp.text();

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // If upstream gives HTML/text, make it a clean error
      return json(
        {
          error: "Upstream returned non-JSON",
          status: resp.status,
          bodyPreview: text.slice(0, 200),
        },
        { status: 502 }
      );
    }

    if (!resp.ok) {
      return json(
        {
          error: "Upstream error",
          status: resp.status,
          upstream: parsed,
        },
        { status: 502 }
      );
    }

    // Normalize shape:
    // - Upstream usually: { data: {...} }
    // - But if anything changes, keep our contract stable
    const card = parsed?.data ?? parsed?.card ?? parsed ?? null;

    if (!card) {
      return json(
        { error: "No card data found in upstream response", upstream: parsed },
        { status: 502 }
      );
    }

    // ✅ Always return { data: card }
    return json({ data: card }, { status: 200 });
  } catch (err: any) {
    return json(
      { error: "Unhandled error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
