export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { clearSessionCookie } from "@/lib/auth";

type Env = { DB: D1Database };

export async function GET(req: Request) {
  const ctx = getRequestContext();
  const env = ctx.env as unknown as Env;

  // Clear cookie + delete session in DB (best effort)
  const cleared = await clearSessionCookie({
    env: { DB: env.DB },
    request: req,
  });

  // Redirect home and forward Set-Cookie header
  const res = NextResponse.redirect(new URL("/", req.url));
  const setCookie = cleared.headers.get("Set-Cookie");
  if (setCookie) res.headers.set("Set-Cookie", setCookie);

  return res;
}
