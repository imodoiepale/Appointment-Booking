import "server-only";
import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { AuthError } from "@/lib/auth/errors";
import type { AppSession, AuthUser } from "@/lib/auth/types";

export const AUTH_SESSION_COOKIE_NAME =
  process.env.AUTH_SESSION_COOKIE_NAME ?? "bcl_auth_session";

const DEFAULT_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days
const sessionMaxAgeMs = Number.parseInt(
  process.env.AUTH_SESSION_MAX_AGE_MS ?? String(DEFAULT_SESSION_MAX_AGE_MS),
  10
);

function parseCookieHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";").map((p) => p.trim())) {
    const [key, ...rest] = pair.split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function resolveUserFromVerifiedToken(token: DecodedIdToken): Promise<AuthUser | null> {
  return {
    id: token.uid,
    firebaseUid: token.uid,
    role: "user",
    username: token.email?.split("@")[0] || null,
    email: token.email || null,
    displayName: token.name || token.email || "User",
    isActive: true,
  };
}

export async function createFirebaseSessionCookie(idToken: string) {
  return getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn: sessionMaxAgeMs });
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(sessionMaxAgeMs / 1000),
  };
}

export async function getAppSessionFromRequest(request: Request): Promise<AppSession | null> {
  const sessionCookie = parseCookieHeader(
    request.headers.get("cookie"),
    AUTH_SESSION_COOKIE_NAME
  );
  if (!sessionCookie) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, false);
    const user = await resolveUserFromVerifiedToken(decoded);
    if (!user || !user.isActive) return null;
    return { tokenUid: decoded.uid, user };
  } catch {
    return null;
  }
}

export async function getServerAppSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, false);
    const user = await resolveUserFromVerifiedToken(decoded);
    if (!user || !user.isActive) return null;
    return { tokenUid: decoded.uid, user };
  } catch {
    return null;
  }
}

export async function requireAppSession(request: Request): Promise<AppSession> {
  const session = await getAppSessionFromRequest(request);
  if (!session) throw new AuthError(401, "Authentication required.");
  if (!session.user.isActive) throw new AuthError(403, "This account is inactive.");
  return session;
}

export async function resolveSessionFromIdToken(idToken: string): Promise<AppSession> {
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken, false);
  const user = await resolveUserFromVerifiedToken(decoded);
  if (!user) throw new AuthError(403, "No account is linked to this Firebase account.");
  if (!user.isActive) throw new AuthError(403, "This account is inactive.");
  return { tokenUid: decoded.uid, user };
}
