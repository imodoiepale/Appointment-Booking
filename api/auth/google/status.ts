import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("google_access_token")?.value;
  const refreshToken = request.cookies.get("google_refresh_token")?.value;
  const cookieEmail = request.cookies.get("google_user_email")?.value || null;
  const mobileUserId = request.headers.get("x-scanner-user-id") || request.nextUrl.searchParams.get("mobile_user_id") || "";
  const mobileUserEmail = request.headers.get("x-scanner-user-email") || request.nextUrl.searchParams.get("login_hint") || "";

  if (accessToken || refreshToken) {
    return NextResponse.json({ connected: true, email: cookieEmail });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  let query = supabase
    .from("email_accounts")
    .select("refresh_token,email")
    .eq("status", "active")
    .limit(1);

  if (mobileUserId) {
    query = query.eq("user_id", mobileUserId);
  } else if (mobileUserEmail) {
    query = query.eq("email", mobileUserEmail);
  }

  const { data } = await query.single();

  return NextResponse.json({ connected: Boolean(data?.refresh_token), email: data?.email ?? cookieEmail });
}
