import { NextRequest, NextResponse } from "next/server";
import { supabase, resolveCallerUser, unauthorized } from "../../meetings/_shared";
import { PUSH_DEVICES_TABLE, MEETINGS_ANDROID_APP } from "@/lib/push/efns-push";

/**
 * POST /api/push/devices — register this phone's FCM token (body: { token, deviceInfo? })
 * DELETE /api/push/devices — body: { token }
 *
 * The Android app calls POST once it has a token and hasn't uploaded that one yet, then again on a
 * later app open if Firebase rotated it. These are the devices /api/push/efns pings when a new EFNS
 * row lands. DELETE isn't wired to anything yet: signing out leaves the token in place, but
 * EfnsAlerts.check() returns early without a session, so a signed-out phone stays silent — the
 * handler exists for cleaning up by hand.
 *
 * In middleware's PUBLIC_PATHS: like the other mobile APIs the route resolves the caller itself
 * (Bearer token or web session) — the middleware only knows about session cookies.
 */

const MAX_TOKEN_LENGTH = 4096;

export async function POST(request: NextRequest) {
  const caller = await resolveCallerUser(request);
  if (!caller) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { token?: unknown; deviceInfo?: unknown };
  const token = String(body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (token.length > MAX_TOKEN_LENGTH) {
    return NextResponse.json({ error: "Token too long" }, { status: 400 });
  }

  const { error } = await supabase.from(PUSH_DEVICES_TABLE).upsert(
    {
      user_id: caller.id,
      fcm_token: token,
      app: MEETINGS_ANDROID_APP,
      platform: "android",
      device_info: body.deviceInfo ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "app,fcm_token" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const caller = await resolveCallerUser(request);
  if (!caller) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { token?: unknown };
  const token = String(body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { error } = await supabase
    .from(PUSH_DEVICES_TABLE)
    .delete()
    .eq("app", MEETINGS_ANDROID_APP)
    .eq("fcm_token", token)
    .eq("user_id", caller.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
