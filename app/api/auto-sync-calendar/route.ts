import { NextRequest, NextResponse } from 'next/server';
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/utils/googleCalendarService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function extractBclAttendeeIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { }
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const meetingData = await request.json();

    if (!meetingData.id_main) {
      return NextResponse.json(
        { error: 'Meeting ID is required for auto-sync' },
        { status: 400 }
      );
    }

    const bclAttendeeIds = extractBclAttendeeIds(meetingData.bcl_attendee);

    const meetingForSync = {
      id_main: meetingData.id_main,
      client_name: meetingData.client_name,
      client_company: meetingData.client_company,
      meeting_date: meetingData.meeting_date,
      meeting_start_time: meetingData.meeting_start_time,
      meeting_end_time: meetingData.meeting_end_time,
      meeting_duration: meetingData.meeting_duration,
      meeting_slot_start_time: meetingData.meeting_slot_start_time,
      meeting_slot_end_time: meetingData.meeting_slot_end_time,
      venue_distance: meetingData.venue_distance,
      meeting_day: meetingData.meeting_day,
      meeting_agenda: meetingData.meeting_agenda,
      meeting_venue_area: meetingData.meeting_venue_area,
      meeting_type: (meetingData.meeting_type === 'inPerson' ? 'physical' : 'virtual') as 'physical' | 'virtual',
      client_mobile: meetingData.client_mobile,
      status: meetingData.status,
      badge_status: meetingData.badge_status,
      created_by: meetingData.created_by,
      updated_by: meetingData.updated_by,
    };

    const eventId = await createGoogleCalendarEvent(meetingForSync, bclAttendeeIds);

    if (eventId) {
      const { data: updatedMeeting } = await supabase
        .from('bcl_meetings_meetings')
        .select('google_meet_link')
        .eq('id_main', meetingData.id_main)
        .single();

      return NextResponse.json({
        success: true,
        eventId,
        hangoutLink: updatedMeeting?.google_meet_link,
        message: 'Meeting automatically synced to Google Calendar',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to sync meeting to Google Calendar' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in auto-sync:', error.message);
    return NextResponse.json(
      { error: error.message || 'Auto-sync failed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const meetingData = await request.json();

    if (!meetingData.id_main) {
      return NextResponse.json(
        { error: 'Meeting ID is required for auto-sync' },
        { status: 400 }
      );
    }

    const bclAttendeeIds = extractBclAttendeeIds(meetingData.bcl_attendee);

    const meetingForSync = {
      id_main: meetingData.id_main,
      client_name: meetingData.client_name,
      client_company: meetingData.client_company,
      meeting_date: meetingData.meeting_date,
      meeting_start_time: meetingData.meeting_start_time,
      meeting_end_time: meetingData.meeting_end_time,
      meeting_duration: meetingData.meeting_duration,
      meeting_slot_start_time: meetingData.meeting_slot_start_time,
      meeting_slot_end_time: meetingData.meeting_slot_end_time,
      venue_distance: meetingData.venue_distance,
      meeting_day: meetingData.meeting_day,
      meeting_agenda: meetingData.meeting_agenda,
      meeting_venue_area: meetingData.meeting_venue_area,
      meeting_type: (meetingData.meeting_type === 'inPerson' ? 'physical' : 'virtual') as 'physical' | 'virtual',
      client_mobile: meetingData.client_mobile,
      status: meetingData.status,
      badge_status: meetingData.badge_status,
      created_by: meetingData.created_by,
      updated_by: meetingData.updated_by,
    };

    const eventId = await updateGoogleCalendarEvent(meetingForSync, bclAttendeeIds);

    return NextResponse.json({
      success: true,
      eventId,
      message: 'Meeting automatically updated in Google Calendar',
    });
  } catch (error: any) {
    console.error('Error in auto-sync update:', error.message);
    return NextResponse.json(
      { error: error.message || 'Auto-sync update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('id');

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required for auto-sync deletion' },
        { status: 400 }
      );
    }

    await deleteGoogleCalendarEvent(parseInt(meetingId));

    return NextResponse.json({
      success: true,
      message: 'Meeting automatically removed from Google Calendar',
    });
  } catch (error: any) {
    console.error('Error in auto-sync deletion:', error.message);
    return NextResponse.json(
      { error: error.message || 'Auto-sync deletion failed' },
      { status: 500 }
    );
  }
}
