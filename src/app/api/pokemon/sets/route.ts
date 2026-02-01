// src/app/api/pokemon/sets/route.ts
export const runtime = "edge";

type PtcgSet = {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  printedTotal?: number;
  total?: number;
  images?: {
    symbol?: string;
    logo?: string;
  };
  updatedAt?: string;
};

type UpstreamResponse = {
  data: PtcgSet[];
};

function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // default: don’t let CF cache error responses
      ...headers,
    },
  });
}

function getApiKey() {
  // Prefer server-side secret, fall back to public if that's what you used earlier
  return (
    (process.env.POKEMONTCG_API_KEY || "").trim() ||
    (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY || "").trim()
  );
}

export async function GET() {
  const apiKey = getApiKey();

  const upstream = "https://api.pokemontcg.io/v2/sets?page=1&pageSize=250";

  try {
    // IMPORTANT: Cloudflare Workers fetch does NOT support RequestInit.cache
    const res = await fetch(upstream, {
      headers: {
        Accept: "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      },
    });

    // If upstream is unhappy, return a useful error payload
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return json(
        {
          error: `Upstream error ${res.status}`,
          upstream,
          hint:
            "If this is 504/520 from Cloudflare, the upstream API may be rate-limiting or having regional issues.",
          body: text ? text.slice(0, 1000) : "",
        },
        res.status,
        { "cache-control": "no-store" }
      );
    }

    const payload = (await res.json()) as UpstreamResponse;

    // Normalize what the UI expects, if needed
    const data = (payload?.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      series: s.series ?? null,
      releaseDate: s.releaseDate ?? null,
      printedTotal: s.printedTotal ?? null,
      total: s.total ?? null,
      images_symbol: s.images?.symbol ?? null,
      images_logo: s.images?.logo ?? null,
      updatedAt: s.updatedAt ?? null,
    }));

    // We can allow short edge caching if you want. For now: no-store to keep it simple.
    return json({ data }, 200, { "cache-control": "no-store" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown fetch error";
    return json(
      {
        error: message,
        upstream,
      },
      500,
      { "cache-control": "no-store" }
    );
  }
}
