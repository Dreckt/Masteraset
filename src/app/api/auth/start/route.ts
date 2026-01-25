import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv, nowIso, randomToken, sha256Hex } from "@/lib/cloudflare";

export const runtime = "edge";

const Body = z.object({ email: z.string().email() });

async function sendEmailMagicLink(_to: string, _url: string) {
  // TODO: Plug in Resend/SendGrid/Postmark.
  // Resend example (edge fetch):
  // const env = getEnv();
  // await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ from: "MasteraSet <no-reply@masteraset.com>", to: _to, subject: "Your MasteraSet login link", html: `<a href="${_url}">Login</a>` })
  // });
  console.log("Magic link (stub):", _to, _url);
}

export async function POST(req: Request) {
  const env = getEnv();
  const form = await req.formData();
  const parsed = Body.safeParse({ email: String(form.get("email") ?? "") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const rawToken = randomToken(32);
  const tokenHash = await sha256Hex(rawToken);

  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  await env.DB.prepare(
    "INSERT INTO login_tokens (id, email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, email, tokenHash, expiresAt, createdAt).run();

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const url = `${appUrl}/api/auth/callback?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

  await sendEmailMagicLink(email, url);

  return NextResponse.redirect(new URL("/login?sent=1", req.url));
}
