import { NextResponse } from "next/server";
import { type Env, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "edge";

export async function POST(request: Request, context: { env: Env }) {
  const env = context.env;

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
  const sessionId = match ? decodeURIComponent(match[1]) : "";

  if (sessionId) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
