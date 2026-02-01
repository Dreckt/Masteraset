import { notFound } from "next/navigation";

export const runtime = "edge";

interface PokemonSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  printedTotal: number | null;
  total: number;
  images_symbol: string | null;
  images_logo: string | null;
  updatedAt: string;
}

function getBaseUrl(): string {
  // Prefer explicit env var if set, otherwise hard-fallback to prod domain
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.startsWith("http")) return envUrl;

  const pagesUrl = process.env.CF_PAGES_URL; // sometimes exists without scheme
  if (pagesUrl) return pagesUrl.startsWith("http") ? pagesUrl : `https://${pagesUrl}`;

  return "https://masteraset.com";
}

async function getSet(id: string): Promise<PokemonSet | null> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/pokemon/sets/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;

  const payload: any = await res.json();

  // payload may be { data: ... } or direct object
  const set = (payload?.data ?? payload) as PokemonSet;

  if (!set?.id) return null;

  return set;
}

export default async function SetPage({
  params,
}: {
  params: { setId: string };
}) {
  const set = await getSet(params.setId);

  if (!set) notFound();

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-2">{set.name}</h1>
      <p className="text-gray-400 mb-4">
        {set.series} • Released {set.releaseDate}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <span className="text-sm text-gray-500">Total Cards</span>
          <div className="text-xl font-semibold">{set.total}</div>
        </div>
        <div>
          <span className="text-sm text-gray-500">Printed Total</span>
          <div className="text-xl font-semibold">
            {set.printedTotal ?? "Unknown"}
          </div>
        </div>
      </div>
    </main>
  );
}

