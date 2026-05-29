import { NextRequest, NextResponse } from 'next/server';
import { createGoogleCalendarEntryForEvent, updateGoogleCalendarEntryForEvent } from '@/utils/googleCalendarService';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    if (!event.id || !event.event_date || !event.event_start_time) {
      return NextResponse.json(
        { error: 'Missing required event fields (id, event_date, event_start_time)' },
        { status: 400 }
      );
    }

    let eventId;
    if (event.google_event_id) {
      eventId = await updateGoogleCalendarEntryForEvent(event);
    } else {
      eventId = await createGoogleCalendarEntryForEvent(event);
    }

    if (eventId) {
      return NextResponse.json({
        success: true,
        eventId,
        message: 'Event successfully synced to Google Calendar',
      });
    }

    return NextResponse.json({ error: 'Failed to sync Google Calendar entry' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to sync event to Google Calendar' },
      { status: 500 }
    );
  }
}
