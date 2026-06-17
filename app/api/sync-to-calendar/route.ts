import { NextRequest, NextResponse } from 'next/server';
import { createGoogleCalendarEvent } from '@/utils/googleCalendarService';

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
    const appointment = await request.json();

    if (!appointment.id_main || !appointment.meeting_date || !appointment.meeting_start_time) {
      return NextResponse.json(
        { error: 'Missing required appointment fields' },
        { status: 400 }
      );
    }

    const bclAttendeeIds = extractBclAttendeeIds(appointment.bcl_attendee);

    const eventId = await createGoogleCalendarEvent(appointment, bclAttendeeIds);

    if (eventId) {
      return NextResponse.json({
        success: true,
        eventId,
        message: 'Meeting successfully synced to Google Calendar',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to create Google Calendar event' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error syncing to Google Calendar:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync to Google Calendar' },
      { status: 500 }
    );
  }
}
