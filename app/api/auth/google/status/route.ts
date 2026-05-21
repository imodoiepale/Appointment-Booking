import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("google_access_token")?.value;
  const refreshToken = request.cookies.get("google_refresh_token")?.value;

  if (accessToken || refreshToken) {
    return NextResponse.json({ connected: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("email_accounts")
    .select("refresh_token")
    .eq("status", "active")
    .limit(1)
    .single();

  return NextResponse.json({ connected: Boolean(data?.refresh_token) });
}
