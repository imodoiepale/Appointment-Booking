import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signed bearer token for the Android app. Issued by /api/auth/login (client: "mobile") and
// sent back as `Authorization: Bearer <token>`. Format: base64url(payload).base64url(HMAC-SHA256),
// keyed with MOBILE_TOKEN_SECRET. The payload only names the user; their role and active status
// are always re-read from scanner_users, so a token can't carry stale or forged permissions.

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface MobileTokenPayload {
  sub: string; // scanner_users.id
  exp: number; // unix seconds
  v: 1;
}

function secret(): string | null {
  const value = process.env.MOBILE_TOKEN_SECRET;
  return value && value.length >= 32 ? value : null;
}

const sign = (data: string, key: string) => createHmac("sha256", key).update(data).digest("base64url");

/** Returns null (and logs) when MOBILE_TOKEN_SECRET isn't configured. */
export function issueMobileToken(userId: string): { token: string; expiresAt: string } | null {
  const key = secret();
  if (!key) {
    console.warn("[mobile-token] MOBILE_TOKEN_SECRET is missing or shorter than 32 characters — not issuing a token.");
    return null;
  }
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload: MobileTokenPayload = { sub: userId, exp, v: 1 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(body, key)}`, expiresAt: new Date(exp * 1000).toISOString() };
}

/** The scanner_users.id the token was issued to, or null if it's invalid or expired. */
export function verifyMobileToken(token: string): string | null {
  const key = secret();
  if (!key) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(new Uint8Array(expected), new Uint8Array(given))) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MobileTokenPayload;
    if (payload.v !== 1 || typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
