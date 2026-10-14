import { NextRequest, NextResponse } from "next/server";
import { signalEfnsUpdate } from "@/lib/push/efns-push";

/**
 * POST /api/push/efns — the EFNS tables' insert trigger (supabase/migrations/20261014_efns_push.sql).
 *
 * The automation writes immigration_notifications / immigration_payments one row at a time during its
 * hourly run, and each insert fires this. signalEfnsUpdate() only does anything when rows are newer
 * than bcl_push_cursor, so the rest of a burst finds nothing and quietly returns — the app is pinged
 * once, not once per row.
 *
 * Auth: a shared secret in x-bcl-push-secret (EFNS_PUSH_SECRET here, the same value baked into the
 * migration). Without it anyone could post here and push a notification to every phone.
 */

/** Constant-time-ish comparison — the secret must not be guessable one character at a time. */
function secretMatches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: NextRequest) {
  const secret = process.env.EFNS_PUSH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "EFNS_PUSH_SECRET is not set on this deployment" }, { status: 503 });
  }

  const provided = request.headers.get("x-bcl-push-secret") ?? "";
  if (!secretMatches(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await signalEfnsUpdate();
    // Anything other than a clean send is worth seeing in net._http_response — "no devices" and
    // "firebase not configured" are exactly the two things you'd otherwise never notice.
    if (result.error) return NextResponse.json({ success: false, ...result }, { status: 502 });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[push/efns] failed:", error?.message ?? error);
    return NextResponse.json({ error: error?.message ?? "Push failed" }, { status: 500 });
  }
}
