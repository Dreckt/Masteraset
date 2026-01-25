import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv, nowIso } from "@/lib/cloudflare";
import { getUserFromRequest } from "@/lib/auth";

export const runtime = "edge";

const Body = z.object({
  printing_id: z.string().uuid(),
  delta: z.coerce.number().int().min(-50).max(50)
});

export async function POST(req: Request) {
  const env = getEnv();
  const user = await getUserFromRequest();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const form = await req.formData();
  const parsed = Body.safeParse({
    printing_id: String(form.get("printing_id") ?? ""),
    delta: form.get("delta")
  });
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { printing_id, delta } = parsed.data;
  const now = nowIso();

  // Upsert-like logic (SQLite)
  const existing = await env.DB.prepare(
    "SELECT qty FROM user_items WHERE user_id = ? AND printing_id = ?"
  ).bind(user.id, printing_id).first();

  const currentQty = existing ? Number(existing.qty) : 0;
  const nextQty = Math.max(0, currentQty + delta);

  if (!existing) {
    await env.DB.prepare(
      "INSERT INTO user_items (user_id, printing_id, qty, want, for_trade, note, updated_at) VALUES (?, ?, ?, 0, 0, NULL, ?)"
    ).bind(user.id, printing_id, nextQty, now).run();
  } else {
    await env.DB.prepare(
      "UPDATE user_items SET qty = ?, updated_at = ? WHERE user_id = ? AND printing_id = ?"
    ).bind(nextQty, now, user.id, printing_id).run();
  }

  // Redirect back to referring page
  const referer = req.headers.get("referer") || "/me";
  return NextResponse.redirect(referer);
}
