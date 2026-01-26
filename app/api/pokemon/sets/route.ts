import { NextResponse } from "next/server";

export const runtime = "edge";

type Env = { DB: D1Database };

export async function GET() {
  const env = (process.env as any) as Env;

  try {
    const rows = await env.DB.prepare(
      `SELECT id, name, series, releaseDate, printedTotal, total,
              images_symbol AS symbol, images_logo AS logo
       FROM pokemon_sets
       ORDER BY releaseDate ASC`
    ).all();

    const data = (rows.results ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      series: r.series,
      releaseDate: r.releaseDate,
      printedTotal: r.printedTotal,
      total: r.total,
      images: { symbol: r.symbol, logo: r.logo },
    }));

    if (data.length === 0) {
      return NextResponse.json(
        {
          error: "No cached Pokémon sets yet.",
          hint: "Run POST /api/pokemon/import/sets?token=YOUR_TOKEN",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "DB error reading pokemon_sets" },
      { status: 500 }
    );
  }
}
