"use server"

import { deleteGoogleCalendarEvent } from '@/utils/googleCalendarService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

interface FormData {
  id: string,
  meetingAgenda: string;
  clientName: string;
  clientCompany: string;
  meetingStartTime: string;
  meetingEndTime: string;
  meetingSlotStartTime: string;
  meetingSlotEndTime: string;
  meetingDate: string;
  meetingVenueArea: string;
  clientEmail: string;
  meetingType: string;
}

export async function cancelEvent(selectedAppointment: FormData): Promise<boolean> {
  try {
    console.log('Automatically cancelling meeting and syncing to Google Calendar:', selectedAppointment.id);

    // Update meeting status in Supabase
    const { error: updateError } = await supabase
      .from('bcl_meetings_meetings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id_main', selectedAppointment.id);

    if (updateError) {
      console.error('Error updating meeting status:', updateError.message);
      return false;
    }

    // Automatically delete from Google Calendar using auto-sync API
    try {
      const response = await fetch(`/api/auto-sync-calendar?id=${selectedAppointment.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok) {
        console.log('Meeting automatically cancelled in Google Calendar');
      } else {
        console.error('Auto-sync delete API failed:', await response.text());
      }
    } catch (calendarError) {
      console.error('Error cancelling in Google Calendar:', calendarError);
      // Don't fail the operation if calendar sync fails
    }

    return true;
  } catch (error: any) {
    console.error('Error cancelling meeting:', error.message);
    return false;
  }
}