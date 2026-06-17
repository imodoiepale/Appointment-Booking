import { NextRequest, NextResponse } from "next/server";
import { supabase, resolveCallerUser } from "../../meetings/_shared";

const DEFAULT_SETTINGS = {
  meeting_enabled: true,
  meeting_custom_reminders: [60, 30, 0],
  meeting_end_alert: true,
  birthday_enabled: true,
  birthday_days_before: 2,
  birthday_day_of: true,
  birthday_filter: "all",
  event_enabled: true,
  event_custom_reminders: [60, 30],
};

export async function GET(request: NextRequest) {
  try {
    const caller = await resolveCallerUser(request);
    if (!caller) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from("notification_settings")
        .insert([{ user_id: caller.id, ...DEFAULT_SETTINGS }])
        .select("*")
        .single();

      if (insertError) {
        return NextResponse.json({ user_id: caller.id, ...DEFAULT_SETTINGS });
      }
      data = inserted;
    }

    return NextResponse.json(normalise(data));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch notification settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const caller = await resolveCallerUser(request);
    if (!caller) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    const payload = {
      user_id: caller.id,
      meeting_enabled:          body.meeting_enabled          ?? body.meetingEnabled          ?? true,
      meeting_custom_reminders: parseReminders(body.meeting_custom_reminders ?? body.meetingCustomReminders, DEFAULT_SETTINGS.meeting_custom_reminders),
      meeting_end_alert:        body.meeting_end_alert        ?? body.meetingEndAlert        ?? true,
      birthday_enabled:         body.birthday_enabled         ?? body.birthdayEnabled         ?? true,
      birthday_days_before:     typeof (body.birthday_days_before ?? body.birthdayDaysBefore) === "number"
                                  ? (body.birthday_days_before ?? body.birthdayDaysBefore)
                                  : 2,
      birthday_day_of:          body.birthday_day_of          ?? body.birthdayDayOf          ?? true,
      birthday_filter:          body.birthday_filter          ?? body.birthdayFilter          ?? "all",
      event_enabled:            body.event_enabled            ?? body.eventEnabled            ?? true,
      event_custom_reminders:   parseReminders(body.event_custom_reminders ?? body.eventCustomReminders, DEFAULT_SETTINGS.event_custom_reminders),
      updated_at:               new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notification_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(normalise(data));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update notification settings" },
      { status: 500 }
    );
  }
}

function parseReminders(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const parsed = value.map(Number).filter((n) => Number.isFinite(n) && n >= 0);
  return parsed.length ? parsed : fallback;
}

function normalise(row: Record<string, unknown>) {
  return {
    ...row,
    meeting_custom_reminders: Array.isArray(row.meeting_custom_reminders)
      ? row.meeting_custom_reminders
      : DEFAULT_SETTINGS.meeting_custom_reminders,
    event_custom_reminders: Array.isArray(row.event_custom_reminders)
      ? row.event_custom_reminders
      : DEFAULT_SETTINGS.event_custom_reminders,
  };
}
