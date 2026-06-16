import { NextRequest, NextResponse } from "next/server";
import { supabase, resolveCallerUser } from "../../meetings/_shared";

export async function GET(request: NextRequest) {
  try {
    const caller = await resolveCallerUser(request);
    if (!caller) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Attempt to fetch settings
    let { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no settings exist, create/insert default settings
    if (!data) {
      const defaultSettings = {
        user_id: caller.id,
        meeting_enabled: true,
        meeting_1hr: true,
        meeting_30min: true,
        meeting_at_start: true,
        meeting_end_alert: true,
        birthday_enabled: true,
        birthday_2days_before: true,
        birthday_day_of: true,
        event_enabled: true,
        event_1hr: true,
        event_30min: true,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from("notification_settings")
        .insert([defaultSettings])
        .select("*")
        .single();

      if (insertError) {
        // Fall back to returning default settings in memory if insert fails (e.g. key constraint / RLS issue)
        return NextResponse.json(defaultSettings);
      }
      data = insertedData;
    }

    return NextResponse.json(data);
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
    
    // We only allow updating notification settings fields
    const payload = {
      user_id: caller.id,
      meeting_enabled: body.meeting_enabled ?? body.meetingEnabled ?? true,
      meeting_1hr: body.meeting_1hr ?? body.meeting1hr ?? true,
      meeting_30min: body.meeting_30min ?? body.meeting30min ?? true,
      meeting_at_start: body.meeting_at_start ?? body.meetingAtStart ?? true,
      meeting_end_alert: body.meeting_end_alert ?? body.meetingEndAlert ?? true,
      birthday_enabled: body.birthday_enabled ?? body.birthdayEnabled ?? true,
      birthday_2days_before: body.birthday_2days_before ?? body.birthday2DaysBefore ?? true,
      birthday_day_of: body.birthday_day_of ?? body.birthdayDayOf ?? true,
      event_enabled: body.event_enabled ?? body.eventEnabled ?? true,
      event_1hr: body.event_1hr ?? body.event1hr ?? true,
      event_30min: body.event_30min ?? body.event30min ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notification_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update notification settings" },
      { status: 500 }
    );
  }
}
