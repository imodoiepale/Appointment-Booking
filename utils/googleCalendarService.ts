import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MeetingEvent {
  id_main: number;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  meeting_duration?: number;
  meeting_slot_start_time?: string;
  meeting_slot_end_time?: string;
  venue_distance?: string;
  meeting_day?: string;
  client_name: string;
  client_company: string;
  meeting_agenda: string;
  meeting_venue_area: string;
  meeting_type: 'virtual' | 'physical';
  client_mobile?: string;
  status?: string;
  badge_status?: string;
  created_by?: string;
  updated_by?: string;
}

interface NotificationData {
  title: string;
  message: string;
  meetingTime: Date;
  type: '1hour' | '30min' | '10min' | '5min';
}

async function getGoogleCalendarClient() {
  const { cookies } = await import('next/headers');
  const { headers } = await import('next/headers');
  const cookieStore = await cookies();
  const headerStore = await headers();
  const mobileUserId = headerStore.get('x-scanner-user-id') || '';
  const mobileUserEmail = headerStore.get('x-scanner-user-email') || '';
  const accessToken = cookieStore.get('google_access_token')?.value;
  let refreshToken = cookieStore.get('google_refresh_token')?.value;

  if (!refreshToken) {
    let query = supabase
      .from('email_accounts')
      .select('refresh_token')
      .eq('status', 'active')
      .limit(1);

    if (mobileUserId) {
      query = query.eq('user_id', mobileUserId);
    } else if (mobileUserEmail) {
      query = query.eq('email', mobileUserEmail);
    }

    const { data } = await query.single();
    refreshToken = data?.refresh_token ?? undefined;
  }

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

function toHHMM(t: string | undefined): string {
  if (!t) return '--:--';
  const parts = t.split(':');
  return `${parts[0]}:${parts[1]}`;
}

function calcTravelMinutes(slotTime: string | undefined, meetingTime: string): number {
  if (!slotTime) return 0;
  const [sh, sm] = slotTime.split(':').map(Number);
  const [mh, mm] = meetingTime.split(':').map(Number);
  return Math.abs((mh * 60 + mm) - (sh * 60 + sm));
}

function buildEventDescription(meeting: MeetingEvent) {
  const hasSlot = !!(meeting.meeting_slot_start_time && meeting.meeting_slot_end_time);
  const travelMins = hasSlot ? calcTravelMinutes(meeting.meeting_slot_start_time, meeting.meeting_start_time) : 0;

  const lines: string[] = [
    '── SCHEDULE ──',
  ];

  if (hasSlot) {
    lines.push(`Slot Time:    ${toHHMM(meeting.meeting_slot_start_time)} → ${toHHMM(meeting.meeting_slot_end_time)}  (includes travel each way)`);
    lines.push(`Meeting Time: ${toHHMM(meeting.meeting_start_time)} → ${toHHMM(meeting.meeting_end_time)}  (${meeting.meeting_duration ?? '?'} min)`);
    lines.push(`Travel Time:  ${travelMins} min each way`);
  } else {
    lines.push(`Meeting Time: ${toHHMM(meeting.meeting_start_time)} → ${toHHMM(meeting.meeting_end_time)}  (${meeting.meeting_duration ?? '?'} min)`);
  }

  lines.push(
    '',
    '── CLIENT ──',
    `Name:    ${meeting.client_name}`,
    `Company: ${meeting.client_company}`,
    `Mobile:  ${meeting.client_mobile || 'N/A'}`,
    '',
    '── VENUE ──',
    `Location: ${meeting.meeting_venue_area}`,
    `Type:     ${meeting.meeting_type === 'virtual' ? 'Virtual / Online' : 'In Person'}`,
    ...(meeting.venue_distance ? [`Distance: ${meeting.venue_distance}`] : []),
    '',
    '── AGENDA ──',
    meeting.meeting_agenda || 'No agenda provided.',
    '',
    '── STATUS ──',
    `Meeting Status: ${meeting.status || 'upcoming'}`,
    `Confirmation:   ${meeting.badge_status || 'Open'}`,
    '',
    '── TRACKING ──',
    ...(meeting.created_by ? [`Created by: ${meeting.created_by}`] : []),
    ...(meeting.updated_by ? [`Updated by: ${meeting.updated_by}`] : []),
  );

  return lines.join('\n');
}

function buildCalendarEvent(meeting: MeetingEvent) {
  // Use slot times (which include travel) if available, otherwise fall back to meeting times
  const eventStart = toHHMM(meeting.meeting_slot_start_time) !== '--:--'
    ? meeting.meeting_slot_start_time!
    : meeting.meeting_start_time;
  const eventEnd = toHHMM(meeting.meeting_slot_end_time) !== '--:--'
    ? meeting.meeting_slot_end_time!
    : meeting.meeting_end_time;

  return {
    summary: `Meeting with ${meeting.client_name} - ${meeting.client_company}`,
    description: buildEventDescription(meeting),
    start: {
      dateTime: `${meeting.meeting_date}T${toHHMM(eventStart)}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    end: {
      dateTime: `${meeting.meeting_date}T${toHHMM(eventEnd)}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 60 },
        { method: 'email', minutes: 30 },
        { method: 'popup', minutes: 30 },
        // At slot start (departure time) — "time to leave" alert
        { method: 'popup', minutes: 0 },
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
      .from('bcl_meetings_meetings')
      .update({
        google_event_id: eventId,
        google_meet_link: meetLink,
        ...(meeting.created_by ? { created_by: meeting.created_by } : {}),
        ...(meeting.updated_by ? { updated_by: meeting.updated_by } : {}),
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
      .from('bcl_meetings_meetings')
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
      .from('bcl_meetings_meetings')
      .update({
        google_meet_link: meetLink,
        ...(meeting.updated_by ? { updated_by: meeting.updated_by } : {}),
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
      .from('bcl_meetings_meetings')
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
      .from('bcl_meetings_meetings')
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
      .from('bcl_meetings_meetings')
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
