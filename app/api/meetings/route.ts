import { NextRequest, NextResponse } from "next/server";
import { supabase, normaliseBclAttendee, enrichWithAttendeeNames } from "./_shared";

const ACTIVE_STATUSES = ["upcoming", "rescheduled"];
const ADMIN_ROLES = new Set(["admin", "super_admin", "administrator"]);

function toInteger(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getMobileUser(request: NextRequest) {
  return {
    id: request.headers.get("x-scanner-user-id") ?? "",
    email: request.headers.get("x-scanner-user-email") ?? "",
    name: request.headers.get("x-scanner-user-name") ?? "",
    role: request.headers.get("x-scanner-user-role") ?? "",
  };
}

function isAdminRole(role: string) {
  return ADMIN_ROLES.has(role.toLowerCase());
}

function escapeOrValue(value: string) {
  return value.replace(/[(),]/g, " ").trim();
}

function applyUserScope(query: any, request: NextRequest) {
  const user = getMobileUser(request);
  if (!user.id || isAdminRole(user.role)) return query;

  const clauses = [
    user.id ? `created_by.eq.${user.id}` : "",
    user.id ? `bcl_attendee.cs.["${user.id}"]` : "",
    user.email ? `created_by.eq.${escapeOrValue(user.email)}` : "",
    user.email ? `updated_by.eq.${escapeOrValue(user.email)}` : "",
  ].filter(Boolean);

  return clauses.length > 0 ? query.or(clauses.join(",")) : query;
}

function toMeetingPayload(body: Record<string, any>, request?: NextRequest) {
  const user = request ? getMobileUser(request) : { id: "", email: "", name: "" };
  const meetingDate = body.meeting_date ?? body.meetingDate;
  const meetingStartTime = body.meeting_start_time ?? body.meetingStartTime;
  const meetingEndTime = body.meeting_end_time ?? body.meetingEndTime;
  const duration = toInteger(body.meeting_duration ?? body.meetingDuration, 60);
  const venueDistance = toInteger(body.venue_distance ?? body.venueDistance, 0);

  return {
    booking_date: body.booking_date ?? body.bookingDate ?? new Date().toISOString().split("T")[0],
    booking_day: body.booking_day ?? body.bookingDay ?? new Date().toLocaleDateString("en-US", { weekday: "long" }),
    meeting_date: meetingDate,
    meeting_day: body.meeting_day ?? body.meetingDay,
    meeting_type: body.meeting_type ?? body.meetingType,
    meeting_venue_area: body.meeting_venue_area ?? body.meetingVenueArea ?? body.location ?? "",
    client_name: body.client_name ?? body.clientName,
    client_company: body.client_company ?? body.clientCompany ?? "",
    client_mobile: body.client_mobile ?? body.clientMobile ?? "",
    bcl_attendee: normaliseBclAttendee(body.bcl_attendee ?? body.bclAttendee),
    bcl_attendee_mobile: body.bcl_attendee_mobile ?? body.bclAttendeeMobile ?? "",
    meeting_agenda: body.meeting_agenda ?? body.meetingAgenda ?? body.description ?? "",
    meeting_duration: duration,
    venue_distance: venueDistance,
    meeting_start_time: meetingStartTime,
    meeting_end_time: meetingEndTime,
    meeting_slot_start_time: body.meeting_slot_start_time ?? body.meetingSlotStartTime ?? meetingStartTime,
    meeting_slot_end_time: body.meeting_slot_end_time ?? body.meetingSlotEndTime ?? meetingEndTime,
    badge_status: body.badge_status ?? body.badgeStatus ?? "Open",
    status: body.status ?? "upcoming",
    created_by: body.created_by ?? body.createdBy ?? (user.id || user.email || user.name || null),
    updated_by: body.updated_by ?? body.updatedBy ?? null,
    google_event_id: body.google_event_id ?? null,
    google_meet_link: body.google_meet_link ?? null,
  };
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    let query = applyUserScope(supabase.from("bcl_meetings_meetings").select("*"), request);

    if (date) query = query.eq("meeting_date", date);
    if (status) query = query.eq("status", status);
    if (limit) query = query.limit(toInteger(limit, 100));

    query = query
      .order("meeting_date", { ascending: order === "asc" })
      .order("meeting_start_time", { ascending: order === "asc" });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enriched = await enrichWithAttendeeNames(data ?? []);
    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = toMeetingPayload(body, request);

    if (!payload.meeting_date || !payload.meeting_start_time || !payload.meeting_end_time || !payload.client_name) {
      return NextResponse.json(
        { error: "client_name, meeting_date, meeting_start_time, and meeting_end_time are required" },
        { status: 400 }
      );
    }

    const newSlotStart = timeToMinutes(payload.meeting_slot_start_time);
    const newSlotEnd = timeToMinutes(payload.meeting_slot_end_time);

    if (newSlotStart !== null && newSlotEnd !== null) {
      const { data: existingMeetings, error: conflictError } = await supabase
        .from("bcl_meetings_meetings")
        .select("id_main, meeting_slot_start_time, meeting_slot_end_time, client_name")
        .eq("meeting_date", payload.meeting_date)
        .in("status", ACTIVE_STATUSES);

      if (conflictError) {
        return NextResponse.json({ error: conflictError.message }, { status: 500 });
      }

      const conflict = (existingMeetings ?? []).find((meeting) => {
        const existingStart = timeToMinutes(meeting.meeting_slot_start_time);
        const existingEnd = timeToMinutes(meeting.meeting_slot_end_time);
        return existingStart !== null && existingEnd !== null && newSlotStart < existingEnd && existingStart < newSlotEnd;
      });

      if (conflict) {
        return NextResponse.json(
          { error: `This time slot conflicts with an existing meeting for ${conflict.client_name}.` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("bcl_meetings_meetings")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [enriched] = await enrichWithAttendeeNames([data]);
    return NextResponse.json(enriched ?? data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create meeting" }, { status: 500 });
  }
}
