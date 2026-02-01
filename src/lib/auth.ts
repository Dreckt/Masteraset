// src/lib/auth.ts
// Canonical auth constants/types live here.
// Cloudflare Workers-safe (no Node Buffer).

import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "masteraset_session";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type SessionData = {
  user: SessionUser;
};

/**
 * Create a session and set the cookie.
 * Intentionally flexible (...args: any[]) to match existing call-sites.
 */
export async function createSession(...args: any[]): Promise<any> {
  const payloadCandidate =
    args.find((a) => a && typeof a === "object" && ("user" in a || "id" in a)) ?? null;

  const user: SessionUser | null =
    payloadCandidate && "user" in payloadCandidate
      ? (payloadCandidate as any).user
      : payloadCandidate && "id" in payloadCandidate
        ? (payloadCandidate as any)
        : null;

  const session: SessionData | null = user ? { user } : null;
  const value = session ? base64EncodeJson(session) : "";

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30 // 30 days
  };

  // If a Response-like object was passed, attach Set-Cookie header
  const responseCandidate = args.find(
    (a) =>
      a &&
      typeof a === "object" &&
      typeof (a as any).headers?.set === "function" &&
      typeof (a as any).headers?.get === "function"
  );

  if (responseCandidate) {
    const existing = (responseCandidate as any).headers.get("set-cookie");
    const setCookie = serializeCookie(SESSION_COOKIE_NAME, value, cookieOptions);
    (responseCandidate as any).headers.set(
      "set-cookie",
      existing ? `${existing}, ${setCookie}` : setCookie
    );
    return responseCandidate;
  }

  // Otherwise, set cookie via Next cookies()
  try {
    cookies().set(SESSION_COOKIE_NAME, value, cookieOptions);
  } catch {
    // ignore
  }

  return session;
}

/**
 * Read session user from a request (or from Next cookies()).
 */
export async function getUserFromRequest(...args: any[]): Promise<any> {
  const req = args.find(
    (a) => a && typeof a === "object" && typeof (a as any).headers?.get === "function"
  );

  let raw: string | null = null;

  if (req) {
    const cookieHeader = (req as any).headers.get("cookie") as string | null;
    raw = cookieHeader ? readCookieFromHeader(cookieHeader, SESSION_COOKIE_NAME) : null;
  }

  if (!raw) {
    try {
      raw = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
    } catch {
      raw = null;
    }
  }

  if (!raw) return null;

  const data = base64DecodeJson<SessionData>(raw);
  return data?.user ?? null;
}

/**
 * Destroy session by expiring the cookie.
 */
export async function destroySession(...args: any[]): Promise<void> {
  const responseCandidate = args.find(
    (a) =>
      a &&
      typeof a === "object" &&
      typeof (a as any).headers?.set === "function" &&
      typeof (a as any).headers?.get === "function"
  );

  const expired = serializeCookie(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  if (responseCandidate) {
    (responseCandidate as any).headers.set("set-cookie", expired);
    return;
  }

  try {
    cookies().set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });
  } catch {
    // ignore
  }
}

/** Cookie helpers */
function readCookieFromHeader(header: string, name: string): string | null {
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(name + "=")) return part.slice(name.length + 1);
  }
  return null;
}

function serializeCookie(
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    maxAge?: number;
  }
): string {
  const enc = encodeURIComponent;
  let out = `${name}=${enc(value)}`;

  if (opts.maxAge !== undefined) out += `; Max-Age=${opts.maxAge}`;
  if (opts.path) out += `; Path=${opts.path}`;
  if (opts.sameSite) out += `; SameSite=${opts.sameSite}`;
  if (opts.secure) out += `; Secure`;
  if (opts.httpOnly) out += `; HttpOnly`;

  return out;
}

/** Workers-safe base64 JSON helpers (no Node Buffer) */
function base64EncodeJson(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64DecodeJson<T>(b64: string): T | null {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
