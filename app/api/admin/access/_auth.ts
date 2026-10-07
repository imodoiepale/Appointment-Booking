import "server-only";
import { NextResponse } from "next/server";
import { AuthError, toAuthErrorResponse } from "@/lib/auth/errors";
import { requireAppSession } from "@/lib/auth/session";

/** User Access administration is for Super Admins only. */
export async function requireSuperAdmin(request: Request) {
  const session = await requireAppSession(request);
  if (!session.user.isSuperAdmin) throw new AuthError(403, "Only Super Admin can manage user access.");
  return session;
}

export function accessErrorResponse(error: unknown, fallback: string) {
  const authResponse = toAuthErrorResponse(error);
  if (authResponse) return authResponse;
  console.error(`${fallback}:`, error);
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}
