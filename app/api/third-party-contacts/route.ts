import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("third_party_contacts")
      .select("id, contact_name, email_address, office_mobile, personal_mobile, contact_type, position, organization_name, status")
      .eq("status", "active")
      .order("contact_name");

    if (error) throw error;

    const contacts = (data ?? []).map((c) => ({
      id: c.id,
      name: c.contact_name,
      email: c.email_address || "",
      mobile: c.office_mobile || c.personal_mobile || "",
      type: c.contact_type || "",
      position: c.position || "",
      organization: c.organization_name || "",
    }));

    return NextResponse.json(contacts);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch third party contacts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, mobile, type, position, organization } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "contact_name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("third_party_contacts")
      .insert([{
        contact_name: name.trim(),
        email_address: email || null,
        office_mobile: mobile || null,
        contact_type: type || null,
        position: position || null,
        organization_name: organization || null,
        status: "active",
      }])
      .select("id, contact_name, email_address, office_mobile, contact_type, position, organization_name")
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      name: data.contact_name,
      email: data.email_address || "",
      mobile: data.office_mobile || "",
      type: data.contact_type || "",
      position: data.position || "",
      organization: data.organization_name || "",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create third party contact" },
      { status: 500 }
    );
  }
}
