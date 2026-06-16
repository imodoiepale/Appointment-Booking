import { NextRequest, NextResponse } from "next/server";
import { supabase, enrichWithAttendeeNames, resolveCallerUser, ADMIN_ROLES } from "../_shared";

const ACTIVE_STATUSES = ["upcoming", "rescheduled"];

function timeToMinutes(time: string): number | null {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
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

  // Conflict check when time slot is being rescheduled
  const slotStart = updatePayload.meeting_slot_start_time as string | undefined;
  const slotEnd = updatePayload.meeting_slot_end_time as string | undefined;
  const meetingDate = updatePayload.meeting_date as string | undefined;

  if (slotStart && slotEnd && meetingDate) {
    const newStart = timeToMinutes(slotStart);
    const newEnd = timeToMinutes(slotEnd);

    if (newStart !== null && newEnd !== null) {
      // Fetch the current meeting to know its attendees if not supplied in body
      const { data: current } = await supabase
        .from("bcl_meetings_meetings")
        .select("bcl_attendee")
        .eq("id_main", id)
        .single();

      const newBclAttendees = new Set<string>(
        Array.isArray(updatePayload.bcl_attendee)
          ? (updatePayload.bcl_attendee as any[]).map(String)
          : Array.isArray(current?.bcl_attendee)
            ? (current.bcl_attendee as any[]).map(String)
            : []
      );

      const { data: existingMeetings } = await supabase
        .from("bcl_meetings_meetings")
        .select("id_main, meeting_slot_start_time, meeting_slot_end_time, client_name, bcl_attendee")
        .eq("meeting_date", meetingDate)
        .in("status", ACTIVE_STATUSES)
        .neq("id_main", id); // exclude self

      const conflict = (existingMeetings ?? []).find((m) => {
        const s = timeToMinutes(m.meeting_slot_start_time);
        const e = timeToMinutes(m.meeting_slot_end_time);
        const timesOverlap = s !== null && e !== null && newStart < e && s < newEnd;
        if (!timesOverlap) return false;
        const existingAttendees: string[] = Array.isArray(m.bcl_attendee)
          ? m.bcl_attendee.map(String)
          : [];
        return existingAttendees.some(aid => newBclAttendees.has(aid));
      });

      if (conflict) {
        const sharedAttendees: string[] = Array.isArray(conflict.bcl_attendee)
          ? conflict.bcl_attendee.map(String).filter((aid: string) => newBclAttendees.has(aid))
          : [];
        const who = sharedAttendees.join(", ") || "A BCL attendee";
        return NextResponse.json(
          { error: `${who} is already booked for a meeting with ${conflict.client_name} at this time slot.` },
          { status: 409 }
        );
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
