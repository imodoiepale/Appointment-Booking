import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enrichWithAttendeeNames } from "./index";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getMobileUser(request: NextRequest) {
  return {
    email: request.headers.get("x-scanner-user-email") ?? "",
    name: request.headers.get("x-scanner-user-name") ?? "",
  };
}

function sanitizeMeetingUpdatePayload(body: Record<string, unknown>) {
  const blocked = new Set(["id", "id_main", "bcl_attendees_info", "bcl_attendee_name"]);
  return Object.fromEntries(Object.entries(body).filter(([key]) => !blocked.has(key)));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid meeting ID" }, { status: 400 });
  }

  const body = await request.json();
  const userEmail = request.cookies.get("google_user_email")?.value;
  const mobileUser = getMobileUser(request);

  // Build the update payload — user_id is included when the column exists.
  // To enable tracking, add column: ALTER TABLE bcl_meetings_meetings ADD COLUMN updated_by text;
  const updatePayload: Record<string, unknown> = sanitizeMeetingUpdatePayload(body);
  if (userEmail) {
    updatePayload.updated_by = userEmail;
  } else if (mobileUser.email || mobileUser.name) {
    updatePayload.updated_by = mobileUser.email || mobileUser.name;
  }

  const { data, error } = await supabase
    .from("bcl_meetings_meetings")
    .update(updatePayload)
    .eq("id_main", id)
    .select()
    .single();

  if (error) {
    // If the error is about unknown column updated_by, retry without it
    if (error.message?.includes("updated_by")) {
      const { data: retryData, error: retryError } = await supabase
        .from("bcl_meetings_meetings")
        .update(sanitizeMeetingUpdatePayload(body))
        .eq("id_main", id)
        .select()
        .single();

      if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
      const [enrichedRetry] = await enrichWithAttendeeNames([retryData]);
      return NextResponse.json(enrichedRetry ?? retryData);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [enriched] = await enrichWithAttendeeNames([data]);
  return NextResponse.json(enriched ?? data);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid meeting ID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bcl_meetings_meetings")
    .select("*")
    .eq("id_main", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const [enriched] = await enrichWithAttendeeNames([data]);
  return NextResponse.json(enriched ?? data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid meeting ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("bcl_meetings_meetings")
    .delete()
    .eq("id_main", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
