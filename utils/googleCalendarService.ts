import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

interface MeetingEvent {
  id_main: number;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  client_name: string;
  client_company: string;
  meeting_agenda: string;
  meeting_venue_area: string;
  meeting_type: 'virtual' | 'physical';
  client_mobile?: string;
  status?: string;
  badge_status?: string;
}

interface NotificationData {
  title: string;
  message: string;
  meetingTime: Date;
  type: '1hour' | '30min' | '10min' | '5min';
}

async function getGoogleCalendarClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('google_access_token')?.value;
  const refreshToken = cookieStore.get('google_refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    throw new Error('Google Calendar not connected. Please connect your Google Calendar first.');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    ...(accessToken ? { access_token: accessToken } : {}),
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
  });

  if (refreshToken) {
    try {
      await oauth2Client.getAccessToken();
    } catch (error: any) {
      console.error('Error refreshing Google access token:', error.message);
      throw new Error('Google Calendar connection expired. Please reconnect Google Calendar.');
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

function buildEventDescription(meeting: MeetingEvent) {
  return [
    'Meeting Details:',
    `- Client: ${meeting.client_name}`,
    `- Company: ${meeting.client_company}`,
    `- Agenda: ${meeting.meeting_agenda}`,
    `- Venue: ${meeting.meeting_venue_area}`,
    `- Type: ${meeting.meeting_type}`,
    `- Mobile: ${meeting.client_mobile || 'N/A'}`,
    `- Status: ${meeting.status || 'upcoming'}`,
    `- Badge Status: ${meeting.badge_status || 'Open'}`,
  ].join('\n');
}

function buildCalendarEvent(meeting: MeetingEvent) {
  return {
    summary: `Meeting with ${meeting.client_name} - ${meeting.client_company}`,
    description: buildEventDescription(meeting),
    start: {
      dateTime: `${meeting.meeting_date}T${meeting.meeting_start_time}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    end: {
      dateTime: `${meeting.meeting_date}T${meeting.meeting_end_time}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
        { method: 'popup', minutes: 5 },
      ],
    },
    ...(meeting.meeting_type === 'virtual' && {
      conferenceData: {
        createRequest: {
          requestId: `meeting_${meeting.id_main}_${Date.now()}`,
          conferenceSolutionKey: 'hangoutsMeet' as any,
        },
      },
    }),
  };
}

export async function createGoogleCalendarEvent(meeting: MeetingEvent): Promise<string> {
  try {
    const calendar = await getGoogleCalendarClient();
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: buildCalendarEvent(meeting),
      conferenceDataVersion: 1,
    });

    const eventId = response.data?.id || '';
    const meetLink = response.data?.hangoutLink || null;

    await supabase
      .from('bcl_meetings_meetings_duplicate')
      .update({
        google_event_id: eventId,
        google_meet_link: meetLink,
      })
      .eq('id_main', meeting.id_main);

    return eventId;
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.message);
    throw error;
  }
}

export async function getUpcomingMeetingsWithNotifications(): Promise<NotificationData[]> {
  try {
    const calendar = await getGoogleCalendarClient();
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const notifications: NotificationData[] = [];
    const events = response.data.items || [];

    for (const event of events) {
      if (!event.start?.dateTime) continue;

      const eventTime = new Date(event.start.dateTime);
      const timeDiff = eventTime.getTime() - now.getTime();

      if (timeDiff <= 60 * 60 * 1000 && timeDiff > 59 * 60 * 1000) {
        notifications.push({
          title: 'Meeting Reminder - 1 Hour',
          message: `Meeting with ${event.summary} starts in 1 hour`,
          meetingTime: eventTime,
          type: '1hour',
        });
      } else if (timeDiff <= 30 * 60 * 1000 && timeDiff > 29 * 60 * 1000) {
        notifications.push({
          title: 'Meeting Reminder - 30 Minutes',
          message: `Meeting with ${event.summary} starts in 30 minutes`,
          meetingTime: eventTime,
          type: '30min',
        });
      } else if (timeDiff <= 10 * 60 * 1000 && timeDiff > 9 * 60 * 1000) {
        notifications.push({
          title: 'Meeting Reminder - 10 Minutes',
          message: `Meeting with ${event.summary} starts in 10 minutes`,
          meetingTime: eventTime,
          type: '10min',
        });
      } else if (timeDiff <= 5 * 60 * 1000 && timeDiff > 4 * 60 * 1000) {
        notifications.push({
          title: 'Meeting Reminder - 5 Minutes',
          message: `Meeting with ${event.summary} starts in 5 minutes!`,
          meetingTime: eventTime,
          type: '5min',
        });
      }
    }

    return notifications;
  } catch (error: any) {
    console.error('Error getting upcoming meetings:', error.message);
    return [];
  }
}

export async function updateGoogleCalendarEvent(meeting: MeetingEvent): Promise<string> {
  try {
    const calendar = await getGoogleCalendarClient();
    const { data: meetingData } = await supabase
      .from('bcl_meetings_meetings_duplicate')
      .select('google_event_id')
      .eq('id_main', meeting.id_main)
      .single();

    if (!meetingData?.google_event_id) {
      return createGoogleCalendarEvent(meeting);
    }

    const currentEventResponse = await calendar.events.get({
      calendarId: 'primary',
      eventId: meetingData.google_event_id,
    });

    const updatedEvent = {
      ...currentEventResponse.data,
      ...buildCalendarEvent(meeting),
    };

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: meetingData.google_event_id,
      requestBody: updatedEvent,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data?.hangoutLink || null;

    await supabase
      .from('bcl_meetings_meetings_duplicate')
      .update({
        google_meet_link: meetLink,
      })
      .eq('id_main', meeting.id_main);

    return meetingData.google_event_id;
  } catch (error: any) {
    console.error('Error updating Google Calendar event:', error.message);
    throw error;
  }
}

export async function deleteGoogleCalendarEvent(meetingId: number): Promise<void> {
  try {
    const calendar = await getGoogleCalendarClient();
    const { data: meetingData } = await supabase
      .from('bcl_meetings_meetings_duplicate')
      .select('google_event_id')
      .eq('id_main', meetingId)
      .single();

    if (!meetingData?.google_event_id) {
      console.log('No Google Calendar event found for meeting', meetingId);
      return;
    }

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: meetingData.google_event_id,
    });

    await supabase
      .from('bcl_meetings_meetings_duplicate')
      .update({
        google_event_id: null,
        google_meet_link: null,
      })
      .eq('id_main', meetingId);

    console.log('Google Calendar event deleted successfully');
  } catch (error: any) {
    console.error('Error deleting Google Calendar event:', error.message);
    throw error;
  }
}

export async function syncMeetingsToCalendar(): Promise<void> {
  try {
    const { data: meetings, error } = await supabase
      .from('bcl_meetings_meetings_duplicate')
      .select('*')
      .in('status', ['upcoming', 'rescheduled'])
      .is('google_event_id', null);

    if (error) {
      console.error('Error fetching meetings:', error.message);
      return;
    }

    for (const meeting of meetings || []) {
      try {
        await createGoogleCalendarEvent(meeting);
        console.log(`Synced meeting ${meeting.id_main} to Google Calendar`);
      } catch (error) {
        console.error(`Failed to sync meeting ${meeting.id_main}:`, error);
      }
    }
  } catch (error: any) {
    console.error('Error in syncMeetingsToCalendar:', error.message);
  }
}
