import { cookies } from "next/headers";
import { getEnv, nowIso, randomToken, sha256Hex } from "./cloudflare";

const SESSION_COOKIE = "ms_session";
const SESSION_TTL_DAYS = 30;

export type AuthedUser = { id: string; email: string; display_name: string | null };

export async function getUserFromRequest(): Promise<AuthedUser | null> {
  const env = getEnv();
  const c = cookies().get(SESSION_COOKIE)?.value;
  if (!c) return null;

  const sessionHash = await sha256Hex(c);
  const res = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_hash = ? AND s.expires_at > ?`
  ).bind(sessionHash, nowIso()).first();

  if (!res) return null;
  return { id: res.id as string, email: res.email as string, display_name: (res.display_name as string | null) ?? null };
}

export async function createSession(userId: string) {
  const env = getEnv();
  const raw = randomToken(32);
  const sessionHash = await sha256Hex(raw);

  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000).toISOString();

  const sessionId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, session_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(sessionId, userId, sessionHash, expiresAt, createdAt).run();

  cookies().set({
    name: SESSION_COOKIE,
    value: raw,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie() {
  cookies().set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
