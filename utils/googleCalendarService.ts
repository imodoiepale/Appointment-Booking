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
  virtual_meeting_mode?: 'hosted' | 'external' | null;
  meeting_link?: string | null;
  meeting_id?: string | null;
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
  // Web users: google_user_email cookie is set during OAuth and persists 180 days
  const webUserEmail = cookieStore.get('google_user_email')?.value || '';
  const accessToken = cookieStore.get('google_access_token')?.value;
  let refreshToken = cookieStore.get('google_refresh_token')?.value;

  // Determine the identity to use for DB lookups
  const lookupId = mobileUserId;
  const lookupEmail = mobileUserEmail || webUserEmail;

  if (!refreshToken) {
    let query = supabase
      .from('email_accounts')
      .select('refresh_token')
      .eq('status', 'active')
      .limit(1);

    if (lookupId) {
      query = query.eq('user_id', lookupId);
    } else if (lookupEmail) {
      // Match either user_id or email field (web users store google email in both)
      query = query.or(`user_id.eq.${lookupEmail},email.eq.${lookupEmail}`);
    }

    const { data } = await query.single();
    refreshToken = data?.refresh_token ?? undefined;
  }

  if (!accessToken && !refreshToken) {
    throw new Error('Google Calendar not connected. Please connect your Google Calendar first.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured on server.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    ...(accessToken ? { access_token: accessToken } : {}),
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
  });

  if (refreshToken) {
    try {
      const { token } = await oauth2Client.getAccessToken();
      if (token) {
        let updateQuery = supabase
          .from('email_accounts')
          .update({
            token: { access_token: token, refresh_token: refreshToken },
            updated_at: new Date().toISOString(),
          })
          .eq('status', 'active');
        if (lookupId) {
          updateQuery = updateQuery.eq('user_id', lookupId);
        } else if (lookupEmail) {
          updateQuery = updateQuery.or(`user_id.eq.${lookupEmail},email.eq.${lookupEmail}`);
        }
        await updateQuery;
      }
    } catch (error: any) {
      const reason: string = error?.response?.data?.error ?? error.message ?? 'unknown';
      console.error('Google token refresh failed:', reason, '| lookupId:', lookupId, '| lookupEmail:', lookupEmail);

      if (reason === 'invalid_grant' || reason === 'token_expired') {
        let revokeQuery = supabase
          .from('email_accounts')
          .update({ status: 'inactive', is_active: false })
          .eq('status', 'active');
        if (lookupId) revokeQuery = revokeQuery.eq('user_id', lookupId);
        else if (lookupEmail) revokeQuery = revokeQuery.or(`user_id.eq.${lookupEmail},email.eq.${lookupEmail}`);
        await revokeQuery.catch(() => {});
      }

      throw new Error(
        reason === 'invalid_client'
          ? 'Google OAuth credentials not configured correctly on server.'
          : 'Google Calendar connection expired. Please reconnect Google Calendar.'
      );
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
    ...(meeting.meeting_type === 'virtual' && meeting.virtual_meeting_mode === 'external'
      ? [
          ...(meeting.meeting_link ? [`Meeting Link: ${meeting.meeting_link}`] : []),
          ...(meeting.meeting_id ? [`Meeting ID:   ${meeting.meeting_id}`] : []),
        ]
      : []),
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

  const isVirtual = meeting.meeting_type === 'virtual';
  const isExternal = isVirtual && meeting.virtual_meeting_mode === 'external';
  const isHosted = isVirtual && !isExternal;

  return {
    summary: `Meeting with ${meeting.client_name} - ${meeting.client_company}`,
    description: buildEventDescription(meeting),
    ...(isExternal && meeting.meeting_link ? { location: meeting.meeting_link } : {}),
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
    ...(isHosted && {
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

// ─────────────────────────────────────────────────────────────────────────────
// BCL EVENTS  (weddings, fundraisers, tech events, etc.)
// ─────────────────────────────────────────────────────────────────────────────

interface BclEventRecord {
  id: number;
  event_name: string;
  event_type: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_duration?: number;
  event_slot_start_time?: string;
  event_slot_end_time?: string;
  venue_distance?: number;
  event_format?: 'virtual' | 'physical';
  virtual_meeting_mode?: 'hosted' | 'external' | null;
  meeting_link?: string | null;
  meeting_id?: string | null;
  event_venue?: string;
  event_venue_area?: string;
  event_description?: string;
  organizer_name?: string;
  organizer_company?: string;
  organizer_mobile?: string;
  organizer_email?: string;
  expected_attendees?: number;
  status?: string;
  badge_status?: string;
  created_by?: string;
  updated_by?: string;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  wedding: 'Wedding',
  fundraiser: 'Fundraiser',
  tech_event: 'Tech Event',
  conference: 'Conference',
  birthday: 'Birthday',
  party: 'Party',
  gala: 'Gala',
  seminar: 'Seminar',
  workshop: 'Workshop',
  other: 'Event',
};

function buildBclEventDescription(ev: BclEventRecord): string {
  const typeLabel = EVENT_TYPE_LABEL[ev.event_type] ?? 'Event';
  const lines: string[] = [
    `── ${typeLabel.toUpperCase()} ──`,
    `Event:    ${ev.event_name}`,
    `Type:     ${typeLabel}`,
    '',
    '── SCHEDULE ──',
    `Date:     ${ev.event_date}`,
    `Time:     ${toHHMM(ev.event_start_time)} → ${toHHMM(ev.event_end_time)}  (${ev.event_duration ?? '?'} min)`,
  ];

  if (ev.event_venue || ev.event_venue_area || ev.event_format) {
    lines.push('', '── VENUE ──');
    if (ev.event_venue) lines.push(`Venue:    ${ev.event_venue}`);
    if (ev.event_venue_area) lines.push(`Area:     ${ev.event_venue_area}`);
    if (ev.event_format) lines.push(`Format:   ${ev.event_format === 'virtual' ? 'Virtual / Online' : 'Physical'}`);
    if (ev.event_format === 'virtual' && ev.virtual_meeting_mode === 'external') {
      if (ev.meeting_link) lines.push(`Meeting Link: ${ev.meeting_link}`);
      if (ev.meeting_id) lines.push(`Meeting ID:   ${ev.meeting_id}`);
    }
  }

  if (ev.organizer_name || ev.organizer_company) {
    lines.push('', '── ORGANIZER ──');
    if (ev.organizer_name) lines.push(`Name:     ${ev.organizer_name}`);
    if (ev.organizer_company) lines.push(`Company:  ${ev.organizer_company}`);
    if (ev.organizer_mobile) lines.push(`Mobile:   ${ev.organizer_mobile}`);
    if (ev.organizer_email) lines.push(`Email:    ${ev.organizer_email}`);
  }

  if (ev.expected_attendees) {
    lines.push('', `── ATTENDANCE ──`, `Expected: ${ev.expected_attendees} guests`);
  }

  if (ev.event_description) {
    lines.push('', '── NOTES ──', ev.event_description);
  }

  lines.push(
    '',
    '── STATUS ──',
    `Status:       ${ev.status || 'upcoming'}`,
    `Confirmation: ${ev.badge_status || 'Open'}`,
    ...(ev.created_by ? ['', `Created by: ${ev.created_by}`] : []),
  );

  return lines.join('\n');
}

function buildGCalEventFromBclEvent(ev: BclEventRecord) {
  const typeLabel = EVENT_TYPE_LABEL[ev.event_type] ?? 'Event';
  const summary = ev.organizer_name
    ? `${typeLabel}: ${ev.event_name} (${ev.organizer_name})`
    : `${typeLabel}: ${ev.event_name}`;

  // Use slot times (which include travel) if available, otherwise fall back to event times
  const eventStart = toHHMM(ev.event_slot_start_time) !== '--:--'
    ? ev.event_slot_start_time!
    : ev.event_start_time;
  const eventEnd = toHHMM(ev.event_slot_end_time) !== '--:--'
    ? ev.event_slot_end_time!
    : ev.event_end_time;

  const isVirtual = ev.event_format === 'virtual';
  const isExternal = isVirtual && ev.virtual_meeting_mode === 'external';
  const isHosted = isVirtual && !isExternal;

  return {
    summary,
    description: buildBclEventDescription(ev),
    location: (isExternal && ev.meeting_link) ? ev.meeting_link : (ev.event_venue || ev.event_venue_area || undefined),
    start: {
      dateTime: `${ev.event_date}T${toHHMM(eventStart)}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    end: {
      dateTime: `${ev.event_date}T${toHHMM(eventEnd)}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
    ...(isHosted && {
      conferenceData: {
        createRequest: {
          requestId: `event_${ev.id}_${Date.now()}`,
          conferenceSolutionKey: 'hangoutsMeet' as any,
        },
      },
    }),
  };
}

export async function createGoogleCalendarEntryForEvent(ev: BclEventRecord): Promise<string> {
  try {
    const calendar = await getGoogleCalendarClient();
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: buildGCalEventFromBclEvent(ev),
      conferenceDataVersion: 1,
    });

    const gCalId = response.data?.id || '';
    const meetLink = response.data?.hangoutLink || null;

    await supabase
      .from('bcl_events')
      .update({ google_event_id: gCalId, google_meet_link: meetLink })
      .eq('id', ev.id);

    return gCalId;
  } catch (error: any) {
    console.error('Error creating Google Calendar entry for event:', error.message);
    throw error;
  }
}

export async function updateGoogleCalendarEntryForEvent(ev: BclEventRecord): Promise<string> {
  try {
    const calendar = await getGoogleCalendarClient();
    const { data: stored } = await supabase
      .from('bcl_events')
      .select('google_event_id')
      .eq('id', ev.id)
      .single();

    if (!stored?.google_event_id) {
      return createGoogleCalendarEntryForEvent(ev);
    }

    const existing = await calendar.events.get({
      calendarId: 'primary',
      eventId: stored.google_event_id,
    });

    const updateResponse = await calendar.events.update({
      calendarId: 'primary',
      eventId: stored.google_event_id,
      requestBody: { ...existing.data, ...buildGCalEventFromBclEvent(ev) },
      conferenceDataVersion: 1,
    });

    const meetLink = updateResponse.data?.hangoutLink || null;
    if (meetLink) {
      await supabase.from('bcl_events').update({ google_meet_link: meetLink }).eq('id', ev.id);
    }

    return stored.google_event_id;
  } catch (error: any) {
    console.error('Error updating Google Calendar entry for event:', error.message);
    throw error;
  }
}

export async function deleteGoogleCalendarEntryForEvent(eventId: number): Promise<void> {
  try {
    const calendar = await getGoogleCalendarClient();
    const { data: stored } = await supabase
      .from('bcl_events')
      .select('google_event_id')
      .eq('id', eventId)
      .single();

    if (!stored?.google_event_id) return;

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: stored.google_event_id,
    });

    await supabase
      .from('bcl_events')
      .update({ google_event_id: null })
      .eq('id', eventId);
  } catch (error: any) {
    console.error('Error deleting Google Calendar entry for event:', error.message);
    throw error;
  }
}
