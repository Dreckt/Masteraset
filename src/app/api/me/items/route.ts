export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getUserFromRequest } from "@/lib/auth";

type Env = { DB: D1Database };

export async function POST(req: Request) {
  const ctx = getRequestContext();
  const env = ctx.env as unknown as Env;

  const user = await getUserFromRequest({
    env: { DB: env.DB },
    request: req,
  });

  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const form = await req.formData();

  // Your existing code likely expects these fields
  const setId = String(form.get("set_id") || "");
  const cardId = String(form.get("card_id") || "");
  const qty = Number(form.get("qty") || "1");

  if (!setId || !cardId || !Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ ok: false, error: "Missing or invalid set_id, card_id, or qty." }, { status: 400 });
  }

  // Minimal upsert into a user_items table (adjust table/columns if your schema differs)
  // If your schema differs, this still builds and you can paste the next runtime DB error.
  try {
    await env.DB.prepare(
      `
      INSERT INTO user_items (user_id, set_id, card_id, qty)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, set_id, card_id)
      DO UPDATE SET qty = user_items.qty + excluded.qty
      `
    )
      .bind(String(user.id), setId, cardId, qty)
      .run();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to update collection.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
