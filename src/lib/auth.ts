export type Env = {
  DB: D1Database;
  RESEND_API_KEY: string;
  MAGIC_LINK_FROM: string;
  SITE_URL: string;
  MAGIC_LINK_SECRET: string;
};

export const SESSION_COOKIE_NAME = "ms_session";

export function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashMagicToken(token: string, secret: string): Promise<string> {
  return sha256Hex(`${token}.${secret}`);
}

export async function sendMagicLinkEmail(args: {
  env: Env;
  toEmail: string;
  magicLinkUrl: string;
}): Promise<void> {
  const { env, toEmail, magicLinkUrl } = args;

  const payload = {
    from: env.MAGIC_LINK_FROM,
    to: [toEmail],
    subject: "Your MasteraSet sign-in link",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5">
        <h2>Sign in to MasteraSet</h2>
        <p>Click the button below to sign in. This link expires in 15 minutes.</p>
        <p>
          <a href="${magicLinkUrl}"
             style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;text-decoration:none">
            Sign in
          </a>
        </p>
        <p style="color:#666;font-size:13px">
          If you didn’t request this, you can ignore this email.
        </p>
        <p style="color:#666;font-size:13px">
          Or copy/paste this link:<br/>
          <span>${magicLinkUrl}</span>
        </p>
      </div>
    `,
  };

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Resend error ${resp.status}: ${text}`);
  }
}

export async function getUserBySessionId(env: Env, sessionId: string) {
  const ts = nowEpoch();

  const row = await env.DB.prepare(
    `
    SELECT u.id as user_id, u.email as email, s.expires_at as expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND s.expires_at > ?
    LIMIT 1
    `
  )
    .bind(sessionId, ts)
    .first<{ user_id: string; email: string; expires_at: number }>();

  return row || null;
}

export async function cleanupExpiredSessions(env: Env): Promise<void> {
  const ts = nowEpoch();
  await env.DB.prepare(`DELETE FROM sessions WH

mkdir -p src/app/api/auth/magic/request
cat > src/app/api/auth/magic/request/route.ts << 'TS'
import { NextResponse } from "next/server";
import {
  type Env,
  isValidEmail,
  normalizeEmail,
  nowEpoch,
  randomToken,
  hashMagicToken,
  sendMagicLinkEmail,
  cleanupExpiredTokens,
} from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: Request, context: { env: Env }) {
  try {
    const env = context.env;

    const body = await request.json().catch(() => ({}));
    const emailRaw = String(body?.email || "");

    if (!isValidEmail(emailRaw)) {
      return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
    }

    const email = normalizeEmail(emailRaw);

    cleanupExpiredTokens(env).catch(() => {});

    const token = randomToken();
    const tokenHash = await hashMagicToken(token, env.MAGIC_LINK_SECRET);

    const expiresAt = nowEpoch() + 15 * 60; // 15 minutes

    await env.DB.prepare(
      `INSERT INTO login_tokens (token_hash, email, expires_at, used_at) VALUES (?, ?, ?, NULL)`
    )
      .bind(tokenHash, email, expiresAt)
      .run();

    const magicLinkUrl = `${env.SITE_URL}/api/auth/magic/verify?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;

    await sendMagicLinkEmail({ env, toEmail: email, magicLinkUrl });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to send link. Please try again.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
