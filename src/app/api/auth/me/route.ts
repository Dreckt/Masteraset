import { NextResponse } from "next/server";
import { type Env, SESSION_COOKIE_NAME, getUserBySessionId } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: Request, context: { env: Env }) {
  const env = context.env;

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
  const sessionId = match ? decodeURIComponent(match[1]) : "";

  if (!sessionId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await getUserBySessionId(env, sessionId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: { id: user.user_id, email: user.email } }, { status: 200 });
}
