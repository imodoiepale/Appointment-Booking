import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE_NAME,
  createFirebaseSessionCookie,
  getAppSessionFromRequest,
  getSessionCookieOptions,
  resolveSessionFromIdToken,
} from "@/lib/auth/session";
import { toAuthErrorResponse } from "@/lib/auth/errors";
import { getPermissionsForUser } from "@/lib/auth/access";
import { PERMISSION_KEYS } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

/** The pages this user can open (read from scanner_users.meetings_access). */
async function permissionsFor(user: AuthUser) {
  if (!user.scannerUserId) return [...PERMISSION_KEYS]; // Firebase-only account: unchanged behaviour
  return getPermissionsForUser({ id: user.scannerUserId, role: user.role });
}

function isAuthConfigurationError(error: unknown) {
  return error instanceof Error && error.message.includes("Missing required environment variable");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAppSessionFromRequest(req);
    if (!session) return NextResponse.json({ authenticated: false, user: null });
    return NextResponse.json({ authenticated: true, user: session.user, permissions: await permissionsFor(session.user) });
  } catch (error) {
    if (isAuthConfigurationError(error)) return NextResponse.json({ authenticated: false, user: null });
    const authResponse = toAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    if (!idToken) {
      return NextResponse.json({ success: false, error: "idToken is required." }, { status: 400 });
    }

    const [session, sessionCookie] = await Promise.all([
      resolveSessionFromIdToken(idToken),
      createFirebaseSessionCookie(idToken),
    ]);

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user: session.user,
      permissions: await permissionsFor(session.user),
    });
    response.cookies.set(AUTH_SESSION_COOKIE_NAME, sessionCookie, getSessionCookieOptions());
    return response;
  } catch (error) {
    if (isAuthConfigurationError(error)) {
      return NextResponse.json({ success: false, error: "Sign-in is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    const authResponse = toAuthErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ success: false, error: "Failed to create session." }, { status: 500 });
  }
}
