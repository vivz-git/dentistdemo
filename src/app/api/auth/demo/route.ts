import { NextResponse } from "next/server";
import { DEMO_SESSION, encodeSession, SESSION_COOKIE } from "@/lib/auth/session";

/** Start a demo session. Replace with a real auth provider for production. */
export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/app", request.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, encodeSession(DEMO_SESSION), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
