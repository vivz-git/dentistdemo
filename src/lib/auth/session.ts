/**
 * Demo authentication.
 *
 * The MVP issues a signed-looking demo session cookie with no password. The
 * cookie name and the `getSession` contract are what the rest of the app uses,
 * so a real provider (Supabase Auth, Clerk, Auth.js) can replace this file
 * without touching pages: set the cookie/session on login, read it in proxy.ts.
 */
export const SESSION_COOKIE = "cf_session";

export interface Session {
  userId: string;
  clinicId: string;
  role: "owner" | "manager" | "front_desk";
  demo: true;
}

export const DEMO_SESSION: Session = { userId: "usr_priya", clinicId: "clinic_smilecare", role: "manager", demo: true };

export function encodeSession(s: Session): string {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}

export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString()) as Session;
    return s && s.userId && s.clinicId ? s : null;
  } catch {
    return null;
  }
}
