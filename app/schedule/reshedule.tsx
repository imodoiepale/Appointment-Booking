"use server"

import { updateGoogleCalendarEvent } from '@/utils/googleCalendarService';
import supabase from '@/utils/supabaseClient';

interface FormData {
  eventId: number;
  meetingStartTime: string;
  meetingEndTime: string;
  meetingDate: string;
  meetingAgenda?: string;
  meetingVenueArea?: string;
  meetingType?: string;
  clientName?: string;
  clientCompany?: string;
  client_mobile?: string;
}

export async function updateEvent(formData: FormData): Promise<boolean> {
  try {
    console.log('Automatically rescheduling meeting and syncing to Google Calendar:', formData.eventId);

    // First get the current meeting details from Supabase
    const { data: currentMeeting, error: fetchError } = await supabase
      .from('bcl_meetings_meetings_duplicate')
      .select('*')
      .eq('id_main', formData.eventId)
      .single();

    if (fetchError || !currentMeeting) {
      console.error('Error fetching current meeting:', fetchError?.message);
      return false;
    }

    // Update meeting in Supabase with new date/time
    const { error: updateError } = await supabase
      .from('bcl_meetings_meetings_duplicate')
      .update({
        meeting_date: formData.meetingDate,
        meeting_start_time: formData.meetingStartTime,
        meeting_end_time: formData.meetingEndTime,
        status: 'rescheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id_main', formData.eventId);

    if (updateError) {
      console.error('Error updating meeting in Supabase:', updateError.message);
      return false;
    }

    // Prepare meeting data for Google Calendar sync
    const meetingForSync = {
      id_main: formData.eventId,
      client_name: formData.clientName || currentMeeting.client_name,
      client_company: formData.clientCompany || currentMeeting.client_company,
      meeting_date: formData.meetingDate,
      meeting_start_time: formData.meetingStartTime,
      meeting_end_time: formData.meetingEndTime,
      meeting_agenda: formData.meetingAgenda || currentMeeting.meeting_agenda,
      meeting_venue_area: formData.meetingVenueArea || currentMeeting.meeting_venue_area,
      meeting_type: (formData.meetingType === 'inPerson' ? 'physical' : 'virtual') || currentMeeting.meeting_type,
      client_mobile: formData.client_mobile || currentMeeting.client_mobile
    };

    // Automatically update in Google Calendar using auto-sync API
    try {
      const response = await fetch(`/api/auto-sync-calendar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(meetingForSync)
      });

      if (response.ok) {
        console.log('Meeting automatically rescheduled in Google Calendar');
      } else {
        console.error('Auto-sync update API failed:', await response.text());
      }
    } catch (calendarError) {
      console.error('Error updating in Google Calendar:', calendarError);
      // Don't fail the operation if calendar sync fails
    }

    return true;
  } catch (error: any) {
    console.error('Error rescheduling meeting:', error.message);
    return false;
  }
}