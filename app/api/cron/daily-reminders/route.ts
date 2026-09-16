import { NextRequest, NextResponse } from "next/server";
import { addHours, format, startOfDay } from "date-fns";
import { supabase, normaliseBclAttendee } from "@/app/api/meetings/_shared";
import { getWhatsAppService } from "@/lib/server/whatsapp";

const ACTIVE_STATUSES = ["upcoming", "rescheduled"];
const EAT_OFFSET_HOURS = 3;

function toEAT(utcDate: Date): Date {
  return addHours(utcDate, EAT_OFFSET_HOURS);
}

function toUTC(eatDate: Date): Date {
  return addHours(eatDate, -EAT_OFFSET_HOURS);
}

// Vercel Cron sends Authorization: Bearer {CRON_SECRET}. INTERNAL_API_KEY is
// accepted too, for manual/local triggering — same pattern as bcl-birthday-tracker-module.
function isAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const valid = [process.env.CRON_SECRET, process.env.INTERNAL_API_KEY].filter(Boolean);
  return valid.includes(token);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const nowUTC = new Date();
    const nowEAT = toEAT(nowUTC);
    const todayDateStr = format(nowEAT, "yyyy-MM-dd");
    const todayStartUTC = toUTC(startOfDay(nowEAT));

    const { data: todaysMeetings, error } = await supabase
      .from("bcl_meetings_meetings")
      .select("*")
      .eq("meeting_date", todayDateStr)
      .in("status", ACTIVE_STATUSES)
      .order("meeting_start_time");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const meetings = todaysMeetings ?? [];
    const wa = await getWhatsAppService(supabase);

    // ── Client reminders ────────────────────────────────────────────────────
    let clientsNotified = 0;
    let clientsSkipped = 0;
    const errors: string[] = [];

    for (const m of meetings) {
      const { data: exists } = await supabase
        .from("bcl_meetings_reminder_logs")
        .select("id")
        .eq("meeting_id", m.id_main)
        .eq("reminder_type", "daily_client_reminder")
        .gte("sent_at", todayStartUTC.toISOString());

      if (exists?.length) {
        clientsSkipped++;
        continue;
      }

      const phone = m.client_mobile || m.client_phone;
      if (!phone) {
        clientsSkipped++;
        continue;
      }

      const venue = m.meeting_venue_area || m.venue || "TBD";
      const time = m.meeting_start_time || "TBD";
      const todayLabel = format(nowEAT, "EEEE, dd MMMM yyyy");

      const msg =
        `Hello *${m.client_name}*,\n\n` +
        `Reminder: You have a meeting *today* (${todayLabel}) at *${time}*\n\n` +
        `Venue: ${venue}\n` +
        `Purpose: ${m.meeting_agenda || "Meeting"}\n\n` +
        `If you'd like to reschedule or cancel, please contact us.\n\n` +
        `Looking forward to meeting you!\n\n` +
        `Best regards,\n*BCL*`;

      const sent = await wa.sendText(phone, msg);
      if (sent) {
        await supabase.from("bcl_meetings_reminder_logs").insert({
          meeting_id: m.id_main,
          reminder_type: "daily_client_reminder",
          recipient_group: "client",
          channel: "whatsapp",
        });
        clientsNotified++;
      } else {
        clientsSkipped++;
        errors.push(`Failed to notify client for meeting ${m.id_main}`);
      }
    }

    // ── Staff schedule audit log ────────────────────────────────────────────
    // Delivery happens in-app (the Android app filters its own "today" fetch by
    // bcl_attendee membership) — this is audit-only, guarded once per day so
    // reruns don't double-log.
    let staffWithMeetingsToday = 0;
    const { data: staffLogged } = await supabase
      .from("bcl_meetings_reminder_logs")
      .select("id")
      .eq("reminder_type", "daily_staff_schedule")
      .gte("sent_at", todayStartUTC.toISOString());

    if (!staffLogged?.length) {
      const staffMeetingIds = new Map<string, number>();
      for (const m of meetings) {
        for (const staffId of normaliseBclAttendee(m.bcl_attendee)) {
          if (!staffMeetingIds.has(staffId)) staffMeetingIds.set(staffId, m.id_main);
        }
      }

      for (const meetingId of staffMeetingIds.values()) {
        await supabase.from("bcl_meetings_reminder_logs").insert({
          meeting_id: meetingId,
          reminder_type: "daily_staff_schedule",
          recipient_group: "staff",
          channel: "in_app",
        });
      }
      staffWithMeetingsToday = staffMeetingIds.size;
    }

    return NextResponse.json({
      success: true,
      date: todayDateStr,
      totalMeetingsToday: meetings.length,
      clientsNotified,
      clientsSkipped,
      staffWithMeetingsToday,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Cron job failed" }, { status: 500 });
  }
}
