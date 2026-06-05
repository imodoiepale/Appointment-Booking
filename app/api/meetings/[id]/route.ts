import { NextRequest, NextResponse } from "next/server";
import { supabase, enrichWithAttendeeNames, resolveCallerUser, ADMIN_ROLES } from "../_shared";

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

  const [body, caller] = await Promise.all([request.json(), resolveCallerUser(request)]);

  const updatePayload: Record<string, unknown> = sanitizeMeetingUpdatePayload(body);

  // Stamp updated_by from whichever identity we resolved
  if (caller?.email) {
    updatePayload.updated_by = caller.email;
  } else if (caller?.id) {
    updatePayload.updated_by = caller.id;
  } else {
    // Legacy: fall back to google_user_email cookie (calendar OAuth flow)
    const googleEmail = request.cookies.get("google_user_email")?.value;
    if (googleEmail) updatePayload.updated_by = googleEmail;
  }

  // Authorization: non-admins can only update meetings they created or attend
  if (caller && !ADMIN_ROLES.has((caller.role ?? "").toLowerCase())) {
    const { data: existing } = await supabase
      .from("bcl_meetings_meetings")
      .select("created_by, bcl_attendee")
      .eq("id_main", id)
      .single();

    if (existing) {
      const attendees: string[] = Array.isArray(existing.bcl_attendee)
        ? existing.bcl_attendee.map(String)
        : [];
      const isOwner = existing.created_by === caller.id || existing.created_by === caller.email;
      const isAttendee = attendees.includes(caller.id) || attendees.includes(caller.email);
      if (!isOwner && !isAttendee) {
        return NextResponse.json({ error: "Not authorized to update this meeting" }, { status: 403 });
      }
    }
  }

  const { data, error } = await supabase
    .from("bcl_meetings_meetings")
    .update(updatePayload)
    .eq("id_main", id)
    .select()
    .single();

  if (error) {
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

  // Authorization: non-admins can only delete meetings they created
  const caller = await resolveCallerUser(request);
  if (caller && !ADMIN_ROLES.has((caller.role ?? "").toLowerCase())) {
    const { data: existing } = await supabase
      .from("bcl_meetings_meetings")
      .select("created_by")
      .eq("id_main", id)
      .single();

    if (existing) {
      const isOwner = existing.created_by === caller.id || existing.created_by === caller.email;
      if (!isOwner) {
        return NextResponse.json({ error: "Not authorized to delete this meeting" }, { status: 403 });
      }
    }
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
