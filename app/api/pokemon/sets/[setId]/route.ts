import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: { setId: string } }
) {
  try {
    const { env } = getRequestContext();
    const db = (env as unknown as CloudflareEnv).DB;

    const row = await db
      .prepare(
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
          images: { symbol: (row as any).symbol, logo: (row as any).logo },
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

