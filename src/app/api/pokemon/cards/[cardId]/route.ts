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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchUpstream(cardId: string) {
  const apiKey = process.env.POKEMONTCG_API_KEY;
  const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardId)}`;

  // Retry for transient 504s / non-JSON responses
  const delays = [0, 250, 750, 1500]; // 4 attempts total

  let lastText = "";
  let lastStatus = 0;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await sleep(delays[i]);

    const resp = await fetch(url, {
      headers: {
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
        // Sometimes helps avoid edge cases with upstream behavior
        "Accept": "application/json",
      },
      // Cloudflare Workers hints (safe even if ignored)
      cf: { cacheTtl: 0, cacheEverything: false } as any,
    });

    lastStatus = resp.status;
    lastText = await resp.text();

    // If upstream gave plain "error code: 504" or other non-JSON, retry
    let parsed: any = null;
    try {
      parsed = JSON.parse(lastText);
    } catch {
      // non-JSON => retry unless this was the final attempt
      if (i < delays.length - 1) continue;

      return {
        ok: false as const,
        status: lastStatus,
        kind: "non-json" as const,
        bodyPreview: lastText.slice(0, 200),
      };
    }

    // JSON but not ok => retry if 5xx
    if (!resp.ok) {
      if (resp.status >= 500 && i < delays.length - 1) continue;

      return {
        ok: false as const,
        status: resp.status,
        kind: "json-error" as const,
        upstream: parsed,
      };
    }

    return {
      ok: true as const,
      status: resp.status,
      upstream: parsed,
    };
  }

  return {
    ok: false as const,
    status: lastStatus || 504,
    kind: "non-json" as const,
    bodyPreview: lastText.slice(0, 200) || "error code: 504",
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { cardId: string } }
) {
  try {
    const cardId = params?.cardId;
    if (!cardId) return json({ error: "Missing cardId" }, { status: 400 });

    const result = await fetchUpstream(cardId);

    if (!result.ok) {
      // Make this a clean, actionable error for the UI
      return json(
        {
          error: "Upstream timeout or malformed response",
          status: result.status,
          ...(result.kind === "non-json"
            ? { bodyPreview: result.bodyPreview }
            : { upstream: result.upstream }),
          hint:
            "PokémonTCG API is returning intermittent 504s from Cloudflare. Try again, or we can switch card detail reads to D1 to eliminate upstream dependency.",
        },
        { status: 503 }
      );
    }

    const parsed = result.upstream;

    // Normalize to { data: card }
    const card = parsed?.data ?? parsed?.card ?? parsed ?? null;

    if (!card) {
      return json(
        { error: "No card data found in upstream response", upstream: parsed },
        { status: 502 }
      );
    }

    return json({ data: card }, { status: 200 });
  } catch (err: any) {
    return json(
      { error: "Unhandled error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
