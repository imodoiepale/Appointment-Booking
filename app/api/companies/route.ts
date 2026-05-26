import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("acc_portal_company_duplicate")
      .select("*")
      .order("company_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const companies = (data ?? [])
      .map((company) => ({
        name: company.company_name ?? "",
        phone:
          company.phone_number ??
          company.phone ??
          company.mobile ??
          company.contact_number ??
          "",
        email: company.email ?? company.email_address ?? "",
      }))
      .filter((company) => company.name.trim().length > 0);

    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch companies" }, { status: 500 });
  }
}
