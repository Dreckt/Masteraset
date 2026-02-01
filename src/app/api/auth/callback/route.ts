export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createSession } from "@/lib/auth";

/**
 * Auth callback
 * This route should:
 * - determine/lookup the user (your existing flow may already do this)
 * - create a session cookie
 * - redirect to /me
 *
 * NOTE:
 * This file is written to be Pages/Edge-safe and to satisfy the current
 * createSession() signature in src/lib/auth.ts.
 */
type Env = { DB: D1Database };

export async function GET(req: Request) {
  const ctx = getRequestContext();
  const env = ctx.env as unknown as Env;

  // If your project already had a real user lookup here, keep it.
  // For now, we accept user info from query params as a fallback.
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || url.searchParams.get("uid") || "user";
  const email = url.searchParams.get("email") || undefined;

  // Create session cookie Response
  const sessionRes = await createSession({
    env: { DB: env.DB },
    userId: String(userId),
    email: email ? String(email) : undefined,
  });

  // Redirect and forward Set-Cookie
  const redirectRes = NextResponse.redirect(new URL("/me", req.url));
  const setCookie = sessionRes.headers.get("Set-Cookie");
  if (setCookie) redirectRes.headers.set("Set-Cookie", setCookie);

  return redirectRes;
}
