import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getAppSessionFromRequest } from "@/lib/auth/session";
import { verifyMobileToken } from "@/lib/auth/mobile-token";

// Works out who is calling an API, in this order:
//   1. Android app — `Authorization: Bearer <signed token>` (lib/auth/mobile-token.ts)
//   2. Web app — the Firebase session cookie
//   3. Grace period only — the old unverified `X-Scanner-User-Id` header from older app builds.
//      Allowed while ALLOW_LEGACY_MOBILE_HEADERS isn't "false"; turn it off once everyone has
//      the app version that sends the token.
// Role, email and active status always come from scanner_users — never from request headers.

export type CallerUser = {
  id: string;
  email: string;
  role: string;
  /** "mobile" for the Android app (token or legacy header), "web" for the browser session. */
  source: "mobile" | "web";
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export function legacyMobileHeadersAllowed(): boolean {
  return process.env.ALLOW_LEGACY_MOBILE_HEADERS !== "false";
}

async function loadScannerUser(field: "id" | "firebase_uid", value: string, source: CallerUser["source"]) {
  if (field === "id" && !UUID_RE.test(value)) return null;
  const { data } = await supabase()
    .from("scanner_users")
    .select("id, email, role, is_active")
    .eq(field, value)
    .maybeSingle();
  if (!data || data.is_active === false) return null;
  return { id: String(data.id), email: data.email ?? "", role: String(data.role ?? "user"), source } satisfies CallerUser;
}

function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * The mobile user id from request headers alone (for code that only has `headers()`, like the
 * Google Calendar helpers): the verified token's user, else — in the grace period — the old header.
 */
export function mobileUserIdFromHeaders(headers: { get(name: string): string | null }): string | null {
  const token = bearerToken(headers.get("authorization"));
  if (token) return verifyMobileToken(token);
  if (legacyMobileHeadersAllowed()) return headers.get("x-scanner-user-id") || null;
  return null;
}

export async function resolveCaller(request: Request): Promise<CallerUser | null> {
  // 1. Android app with a signed token
  const token = bearerToken(request.headers.get("authorization"));
  if (token) {
    const userId = verifyMobileToken(token);
    return userId ? loadScannerUser("id", userId, "mobile") : null;
  }

  // 2. Web app session
  try {
    const session = await getAppSessionFromRequest(request);
    if (session) {
      return session.user.scannerUserId
        ? loadScannerUser("id", session.user.scannerUserId, "web")
        : session.user.firebaseUid
          ? loadScannerUser("firebase_uid", session.user.firebaseUid, "web")
          : null;
    }
  } catch {
    // fall through
  }

  // 3. Older app builds (grace period): trust only the user id, and re-read the role.
  const legacyId = request.headers.get("x-scanner-user-id");
  if (legacyId && legacyMobileHeadersAllowed()) return loadScannerUser("id", legacyId, "mobile");

  return null;
}
