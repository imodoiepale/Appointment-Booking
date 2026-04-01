import { NextRequest, NextResponse } from 'next/server';
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/utils/googleCalendarService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

// POST - Auto-sync new meeting to Google Calendar
export async function POST(request: NextRequest) {
  try {
    const meetingData = await request.json();
    
    if (!meetingData.id_main) {
      return NextResponse.json(
        { error: 'Meeting ID is required for auto-sync' },
        { status: 400 }
      );
    }

    console.log('Auto-syncing meeting to Google Calendar:', meetingData.id_main);

    // Create meeting object in the format expected by Google Calendar service
    const meetingForSync = {
      id_main: meetingData.id_main,
      client_name: meetingData.client_name,
      client_company: meetingData.client_company,
      meeting_date: meetingData.meeting_date,
      meeting_start_time: meetingData.meeting_start_time,
      meeting_end_time: meetingData.meeting_end_time,
      meeting_agenda: meetingData.meeting_agenda,
      meeting_venue_area: meetingData.meeting_venue_area,
      meeting_type: (meetingData.meeting_type === 'inPerson' ? 'physical' : 'virtual') as 'physical' | 'virtual',
      client_mobile: meetingData.client_mobile,
      status: meetingData.status,
      badge_status: meetingData.badge_status,
    };

    const eventId = await createGoogleCalendarEvent(meetingForSync);

    if (eventId) {
      // Get the updated meeting data to retrieve the Google Meet link
      const { data: updatedMeeting } = await supabase
        .from('bcl_meetings_meetings')
        .select('google_meet_link')
        .eq('id_main', meetingData.id_main)
        .single();

      return NextResponse.json({
        success: true,
        eventId: eventId,
        hangoutLink: updatedMeeting?.google_meet_link,
        message: 'Meeting automatically synced to Google Calendar'
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

// PUT - Auto-sync meeting updates to Google Calendar
export async function PUT(request: NextRequest) {
  try {
    const meetingData = await request.json();
    
    if (!meetingData.id_main) {
      return NextResponse.json(
        { error: 'Meeting ID is required for auto-sync' },
        { status: 400 }
      );
    }

    console.log('Auto-syncing meeting update to Google Calendar:', meetingData.id_main);

    // Create meeting object in the format expected by Google Calendar service
    const meetingForSync = {
      id_main: meetingData.id_main,
      client_name: meetingData.client_name,
      client_company: meetingData.client_company,
      meeting_date: meetingData.meeting_date,
      meeting_start_time: meetingData.meeting_start_time,
      meeting_end_time: meetingData.meeting_end_time,
      meeting_agenda: meetingData.meeting_agenda,
      meeting_venue_area: meetingData.meeting_venue_area,
      meeting_type: (meetingData.meeting_type === 'inPerson' ? 'physical' : 'virtual') as 'physical' | 'virtual',
      client_mobile: meetingData.client_mobile,
      status: meetingData.status,
      badge_status: meetingData.badge_status,
    };

    const eventId = await updateGoogleCalendarEvent(meetingForSync);

    return NextResponse.json({
      success: true,
      eventId: eventId,
      message: 'Meeting automatically updated in Google Calendar'
    });
  } catch (error: any) {
    console.error('Error in auto-sync update:', error.message);
    return NextResponse.json(
      { error: error.message || 'Auto-sync update failed' },
      { status: 500 }
    );
  }
}

// DELETE - Auto-remove meeting from Google Calendar
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

    console.log('Auto-removing meeting from Google Calendar:', meetingId);

    await deleteGoogleCalendarEvent(parseInt(meetingId));

    return NextResponse.json({
      success: true,
      message: 'Meeting automatically removed from Google Calendar'
    });
  } catch (error: any) {
    console.error('Error in auto-sync deletion:', error.message);
    return NextResponse.json(
      { error: error.message || 'Auto-sync deletion failed' },
      { status: 500 }
    );
  }
}
