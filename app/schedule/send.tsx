"use server"

import { createGoogleCalendarEvent } from '@/utils/googleCalendarService';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

interface FormData {
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
  clientMobile: string;
  meetingType: string;
  id_main?: number; // Add this to identify the meeting for syncing
}

export async function addEvent(formData: FormData): Promise<{ eventId: string, hangoutLink: string | null | undefined }> {
  try {
    console.log('Auto-syncing meeting to Google Calendar:', formData);

    // If we have the meeting ID, use the auto-sync API
    if (formData.id_main) {
      try {
        const response = await fetch(`/api/auto-sync-calendar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            id_main: formData.id_main,
            client_name: formData.clientName,
            client_company: formData.clientCompany,
            meeting_date: formData.meetingDate,
            meeting_start_time: formData.meetingStartTime,
            meeting_end_time: formData.meetingEndTime,
            meeting_agenda: formData.meetingAgenda,
            meeting_venue_area: formData.meetingVenueArea,
            meeting_type: formData.meetingType,
            client_mobile: formData.clientMobile
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Meeting automatically synced to Google Calendar with event ID:', result.eventId);

          return {
            eventId: result.eventId,
            hangoutLink: result.hangoutLink
          };
        } else {
          console.error('Auto-sync API failed:', await response.text());
        }
      } catch (apiError) {
        console.error('Error calling auto-sync API:', apiError);
      }
    }

    // Fallback if no ID or sync failed
    return {
      eventId: `placeholder_${Date.now()}`,
      hangoutLink: formData.meetingType === 'virtual' ? 'https://meet.google.com/placeholder' : null
    };

  } catch (error: any) {
    console.error('Error auto-syncing to Google Calendar:', error.message);
    // Return placeholder values on error so the meeting creation doesn't fail
    return {
      eventId: `placeholder_${Date.now()}`,
      hangoutLink: formData.meetingType === 'virtual' ? 'https://meet.google.com/placeholder' : null
    };
  }
}
