import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv, nowIso, sha256Hex } from "@/lib/cloudflare";
import { createSession } from "@/lib/auth";

export const runtime = "edge";

const Q = z.object({
  token: z.string().min(10),
  email: z.string().email()
});

export async function GET(req: Request) {
  const env = getEnv();
  const { searchParams } = new URL(req.url);
  const parsed = Q.safeParse({ token: searchParams.get("token"), email: searchParams.get("email") });

  if (!parsed.success) return NextResponse.json({ error: "Invalid link" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const tokenHash = await sha256Hex(parsed.data.token);

  const row = await env.DB.prepare(
    `SELECT id, expires_at, used_at FROM login_tokens
     WHERE email = ? AND token_hash = ?`
  ).bind(email, tokenHash).first();

  if (!row) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  if (row.used_at) return NextResponse.json({ error: "Link already used" }, { status: 400 });
  if (String(row.expires_at) <= nowIso()) return NextResponse.json({ error: "Link expired" }, { status: 400 });

  await env.DB.prepare("UPDATE login_tokens SET used_at = ? WHERE id = ?").bind(nowIso(), row.id).run();

  // Ensure user exists
  let user = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    const userId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)"
    ).bind(userId, email, null, nowIso()).run();
    user = { id: userId };
  }

  await createSession(String(user.id));
  return NextResponse.redirect(new URL("/me", req.url));
}
