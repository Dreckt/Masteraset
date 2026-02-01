import { NextResponse } from "next/server";
import {
  type Env,
  normalizeEmail,
  nowEpoch,
  hashMagicToken,
  SESSION_COOKIE_NAME,
  cleanupExpiredSessions,
  cleanupExpiredTokens,
} from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request, context: { env: Env }) {
  const env = context.env;
  const url = new URL(request.url);

  const token = url.searchParams.get("token") || "";
  const emailParam = url.searchParams.get("email") || "";

  if (!token || !emailParam) {
    return NextResponse.redirect(`${env.SITE_URL}/signin?error=invalid_link`);
  }

  const email = normalizeEmail(emailParam);
  const tokenHash = await hashMagicToken(token, env.MAGIC_LINK_SECRET);

  cleanupExpiredSessions(env).catch(() => {});
  cleanupExpiredTokens(env).catch(() => {});

  const ts = nowEpoch();

  const tokenRow = await env.DB.prepare(
    `
    SELECT token_hash, email, expires_at, used_at
    FROM login_tokens
    WHERE token_hash = ?
    LIMIT 1
    `
  )
    .bind(tokenHash)
    .first<{ token_hash: string; email: string; expires_at: number; used_at: number | null }>();

  if (!tokenRow) {
    return NextResponse.redirect(`${env.SITE_URL}/signin?error=invalid_link`);
  }

  if (tokenRow.used_at) {
    return NextResponse.redirect(`${env.SITE_URL}/signin?error=link_used`);
  }

  if (tokenRow.expires_at <= ts) {
    return NextResponse.redirect(`${env.SITE_URL}/signin?error=link_expired`);
  }

  if (normalizeEmail(tokenRow.email) !== email) {
    return NextResponse.redirect(`${env.SITE_URL}/signin?error=invalid_link`);
  }

  await env.DB.prepare(`UPDATE login_tokens SET used_at = ? WHERE token_hash = ?`)
    .bind(ts, tokenHash)
    .run();

  let user = await env.DB.prepare(`SELECT id, email FROM users WHERE email = ? LIMIT 1`)
    .bind(email)
    .first<{ id: string; email: string }>();

  if (!user) {
    const userId = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)`)
      .bind(userId, email, ts)
      .run();
    user = { id: userId, email };
  }

  const sessionId = crypto.randomUUID();
  const sessionExpiresAt = ts + 30 * 24 * 60 * 60; // 30 days

  await env.DB.prepare(`INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .bind(sessionId, user.id, sessionExpiresAt, ts)
    .run();

  const res = NextResponse.redirect(`${env.SITE_URL}/account`);

  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return res;
}
