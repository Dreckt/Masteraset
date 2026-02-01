import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  const cookieNames = [
    "session",
    "SESSION",
    "masteraset_session",
    "masteraset_session_id",
    "__Host-session",
    "__Secure-session",
  ];

  for (const name of cookieNames) {
    res.cookies.set(name, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}

export async function GET() {
  return POST();
}
