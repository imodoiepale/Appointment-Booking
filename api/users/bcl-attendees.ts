import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BCL_COMPANY_ID = 10;

export async function GET(_request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("scanner_users")
      .select("id, first_name, last_name, username, email")
      .eq("company_id", BCL_COMPANY_ID)
      .eq("is_active", true)
      .order("first_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (data ?? []).map((u) => ({
      id: u.id as string,
      displayName:
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.username ||
        u.email ||
        u.id,
      email: u.email as string | null,
      username: u.username as string | null,
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch BCL attendees" },
      { status: 500 }
    );
  }
}
