import { NextRequest, NextResponse } from 'next/server';
import { createGoogleCalendarEvent } from '@/utils/googleCalendarService';

export async function POST(request: NextRequest) {
  try {
    const appointment = await request.json();
    
    // Validate required fields
    if (!appointment.id_main || !appointment.meeting_date || !appointment.meeting_start_time) {
      return NextResponse.json(
        { error: 'Missing required appointment fields' },
        { status: 400 }
      );
    }

    const eventId = await createGoogleCalendarEvent(appointment);
    
    if (eventId) {
      return NextResponse.json({ 
        success: true,
        eventId: eventId,
        message: 'Meeting successfully synced to Google Calendar'
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
