import { NextResponse } from "next/server";
import { clearSessionCookie, getUserFromRequest } from "@/lib/auth";
import { getEnv, nowIso, sha256Hex } from "@/lib/cloudflare";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST(req: Request) {
  const env = getEnv();
  const c = cookies().get("ms_session")?.value;
  if (c) {
    const h = await sha256Hex(c);
    // Delete session rows matching this cookie
    await env.DB.prepare("DELETE FROM sessions WHERE session_hash = ?").bind(h).run();
  }
  clearSessionCookie();
  return NextResponse.redirect(new URL("/", req.url));
}
