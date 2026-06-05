import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("google_access_token")?.value;
  const refreshToken = request.cookies.get("google_refresh_token")?.value;
  const cookieEmail = request.cookies.get("google_user_email")?.value || null;
  const mobileUserId = request.headers.get("x-scanner-user-id") || request.nextUrl.searchParams.get("mobile_user_id") || "";
  const mobileUserEmail = request.headers.get("x-scanner-user-email") || request.nextUrl.searchParams.get("login_hint") || "";
  // Web users: google_user_email cookie persists 180 days from OAuth
  const webUserEmail = cookieEmail || "";

  if (accessToken || refreshToken) {
    return NextResponse.json({ connected: true, email: cookieEmail });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const lookupId = mobileUserId;
  const lookupEmail = mobileUserEmail || webUserEmail;

  let query = supabase
    .from("email_accounts")
    .select("refresh_token,email")
    .eq("status", "active")
    .limit(1);

  if (lookupId) {
    query = query.eq("user_id", lookupId);
  } else if (lookupEmail) {
    query = query.or(`user_id.eq.${lookupEmail},email.eq.${lookupEmail}`);
  }

  const { data } = await query.single();

  return NextResponse.json({ connected: Boolean(data?.refresh_token), email: data?.email ?? cookieEmail });
}
