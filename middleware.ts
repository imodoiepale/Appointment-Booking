import { type NextRequest, NextResponse } from "next/server";

const AUTH_SESSION_COOKIE_NAME =
  process.env.AUTH_SESSION_COOKIE_NAME ?? "bcl_auth_session";

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/auth/google",          // Google Calendar OAuth flow
  "/api/meetings",             // Mobile app meeting fetch/manage API
  "/api/events",               // Mobile app events API
  "/api/birthdays",            // Mobile app birthdays API
  "/api/tasks-report",         // Mobile app tasks report API
  "/api/companies",            // Mobile app company dropdown API
  "/api/users/bcl-attendees",  // Mobile app attendee dropdown API
  "/api/meeting-notifications",
  "/api/auto-sync-calendar",
  "/api/sync-to-calendar",
  "/calendar-auth-success",    // OAuth callback redirect target
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
