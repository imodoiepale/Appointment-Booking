import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const mobileUserId = request.headers.get("x-scanner-user-id") || "";
  const mobileUserEmail = request.headers.get("x-scanner-user-email") || "";
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("email_accounts")
    .update({
      status: "inactive",
      is_active: false,
      refresh_token: null,
      token: {},
      updated_at: new Date().toISOString(),
    })
    .eq("status", "active");

  if (mobileUserId) {
    query = query.eq("user_id", mobileUserId);
  } else if (mobileUserEmail) {
    query = query.eq("email", mobileUserEmail);
  } else {
    query = query.eq("user_id", "google_calendar_auth").eq("email", "google_calendar@system");
  }

  await query;

  const response = NextResponse.json({ success: true });
  response.cookies.delete("google_access_token");
  response.cookies.delete("google_refresh_token");
  response.cookies.delete("google_user_email");
  return response;
}
