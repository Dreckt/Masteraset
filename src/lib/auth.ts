/**
 * Edge-safe auth helpers for Cloudflare Pages + D1.
 *
 * Exports required by the app:
 * - createSession
 * - clearSessionCookie
 * - getUserFromRequest
 * - isValidEmail, normalizeEmail, nowEpoch, randomToken, hashMagicToken, cleanupExpiredTokens, sendMagicLinkEmail
 *
 * IMPORTANT:
 * Cloudflare's env typing may not include all fields at compile-time.
 * So MAGIC_LINK_SECRET and SITE_URL are OPTIONAL in this type to satisfy TS,
 * but you should ensure they exist in your real runtime bindings.
 */

export type Env = {
  DB: D1Database;

  MAGIC_LINK_SECRET?: string;
  SITE_URL?: string;

  ADMIN_TOKEN?: string;
  FROM_EMAIL?: string;
};

export type User = {
  id: string;
  email?: string;
};

/** -----------------------------
 *  Basics
 *  ----------------------------- */

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** -----------------------------
 *  Magic link helpers
 *  ----------------------------- */

export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function hashMagicToken(token: string, secret: string): Promise<string> {
  const input = `${secret}::${token}`;
  const digest = await crypto.subtle.digest("SHA-256", textToBytes(input));
  return bytesToHex(digest);
}

export async function cleanupExpiredTokens(env: { DB: D1Database }): Promise<void> {
  try {
    const now = nowEpoch();
    await env.DB.prepare(`DELETE FROM login_tokens WHERE expires_at <= ? OR used_at IS NOT NULL`)
      .bind(now)
      .run();
  } catch {
    // best effort
  }
}

export async function sendMagicLinkEmail(_args: {
  env: Env;
  toEmail: string;
  magicLinkUrl: string;
}): Promise<void> {
  // Safe no-op until you wire email delivery.
  return;
}

/** -----------------------------
 *  Admin helper (optional)
 *  ----------------------------- */

export function isAdminRequest(req: Request, env: Env): boolean {
  if (!env.ADMIN_TOKEN) return true;
  const token = req.headers.get("x-admin-token")?.trim();
  return Boolean(token && token === env.ADMIN_TOKEN);
}

/** -----------------------------
 *  Session helpers (required exports)
 *  ----------------------------- */

const SESSION_COOKIE = "ms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function json(payload: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...(headers || {}) },
  });
}

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    `Secure`,
  ];
  return parts.join("; ");
}

function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;

  const parts = header.split(";").map((p) => p.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(p.slice(idx + 1));
  }
  return null;
}

export async function createSession(opts: {
  env: { DB: D1Database };
  userId: string;
  email?: string;
  ttlSeconds?: number;
}): Promise<Response> {
  const { env, userId, email } = opts;
  const ttl = typeof opts.ttlSeconds === "number" ? opts.ttlSeconds : SESSION_TTL_SECONDS;

  const sessionId = randomToken(32);
  const expiresAt = nowEpoch() + ttl;

  // Best-effort DB insert (schema may evolve)
  try {
    await env.DB.prepare(
      `INSERT INTO sessions (session_id, user_id, email, expires_at) VALUES (?, ?, ?, ?)`
    )
      .bind(sessionId, userId, email ?? null, expiresAt)
      .run();
  } catch {
    // best effort
  }

  const setCookie = buildCookie(SESSION_COOKIE, sessionId, ttl);
  return json({ ok: true }, 200, { "Set-Cookie": setCookie });
}

export async function clearSessionCookie(opts: {
  env: { DB: D1Database };
  request: Request;
}): Promise<Response> {
  const { env, request } = opts;

  const sessionId = getCookie(request, SESSION_COOKIE);
  if (sessionId) {
    try {
      await env.DB.prepare(`DELETE FROM sessions WHERE session_id = ?`).bind(sessionId).run();
    } catch {
      // best effort
    }
  }

  return json({ ok: true }, 200, { "Set-Cookie": clearCookie(SESSION_COOKIE) });
}

export async function getUserFromRequest(opts: {
  env: { DB: D1Database };
  request: Request;
}): Promise<User | null> {
  const { env, request } = opts;

  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;

  try {
    const now = nowEpoch();
    const sess = await env.DB.prepare(
      `SELECT user_id as userId, email, expires_at as expiresAt FROM sessions WHERE session_id = ? LIMIT 1`
    )
      .bind(sessionId)
      .first<{ userId?: string; email?: string; expiresAt?: number }>();

    if (!sess?.userId) return null;
    if (typeof sess.expiresAt === "number" && sess.expiresAt <= now) return null;

    return { id: String(sess.userId), email: sess.email ? String(sess.email) : undefined };
  } catch {
    return null;
  }
}
