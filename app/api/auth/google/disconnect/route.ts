import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase
    .from("email_accounts")
    .update({
      status: "inactive",
      is_active: false,
      refresh_token: null,
      token: {},
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", "google_calendar_auth")
    .eq("email", "google_calendar@system");

  const response = NextResponse.json({ success: true });
  response.cookies.delete("google_access_token");
  response.cookies.delete("google_refresh_token");
  response.cookies.delete("google_user_email");
  return response;
}
