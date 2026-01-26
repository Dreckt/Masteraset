import { NextResponse } from "next/server";

export const runtime = "edge";

type Env = { DB: D1Database };

export async function GET(
  _req: Request,
  { params }: { params: { setId: string } }
) {
  const env = (process.env as any) as Env;

  try {
    const row = await env.DB.prepare(
      `SELECT id, name, series, releaseDate, printedTotal, total,
              images_symbol AS symbol, images_logo AS logo
       FROM pokemon_sets
       WHERE id = ?`
    )
      .bind(params.setId)
      .first();

    if (!row) {
      return NextResponse.json(
        { error: "Set not found in cache. Run import." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: (row as any).id,
          name: (row as any).name,
          series: (row as any).series,
          releaseDate: (row as any).releaseDate,
          printedTotal: (row as any).printedTotal,
          total: (row as any).total,
          images: {
            symbol: (row as any).symbol,
            logo: (row as any).logo,
          },
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "DB error reading pokemon_sets" },
      { status: 500 }
    );
  }
}
