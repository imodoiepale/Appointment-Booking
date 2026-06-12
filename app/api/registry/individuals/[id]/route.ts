import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { email, mobile, alt_mobile, whatsapp } = body;

    // Fetch existing contact_details to merge
    const { data: existing, error: fetchError } = await supabase
      .from("registry_individuals")
      .select("contact_details")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Build merged contact object
    let cd: any = {};
    const raw = existing?.contact_details;
    if (Array.isArray(raw) && raw.length > 0) {
      cd = JSON.parse(JSON.stringify(raw[0]));
    } else if (raw && typeof raw === "object") {
      cd = JSON.parse(JSON.stringify(raw));
    }

    // Handle possible nested current wrapper
    const target = cd.current ? cd.current : cd;

    if (!target.email) target.email = {};
    if (!target.phone) target.phone = {};
    if (!target.phone.kenyan) target.phone.kenyan = {};

    if (email !== undefined) target.email.primary = email;
    if (mobile !== undefined) target.phone.kenyan.primary = mobile;
    if (alt_mobile !== undefined) target.phone.kenyan.secondary = alt_mobile;
    if (whatsapp !== undefined) target.phone.whatsapp = whatsapp;

    const updatedDetails = cd.current ? { ...cd, current: target } : target;

    const { error: updateError } = await supabase
      .from("registry_individuals")
      .update({ contact_details: [updatedDetails] })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update contact details" },
      { status: 500 }
    );
  }
}
