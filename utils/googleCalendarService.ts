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

// ── Calendar client helpers ───────────────────────────────────────────────────

// Used as a fallback when no BCL attendee has a connected calendar.
// Requires an active HTTP request context (reads cookies/headers).
async function getGoogleCalendarClient() {
  const { cookies } = await import('next/headers');
  const { headers } = await import('next/headers');
  const cookieStore = await cookies();
  const headerStore = await headers();
  const mobileUserId = headerStore.get('x-scanner-user-id') || '';
  const mobileUserEmail = headerStore.get('x-scanner-user-email') || '';
  const webUserEmail = cookieStore.get('google_user_email')?.value || '';
  const accessToken = cookieStore.get('google_access_token')?.value;
  let refreshToken = cookieStore.get('google_refresh_token')?.value;

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

// Resolves the calendar client for a specific BCL attendee by their user ID.
// Does NOT need HTTP request context — reads tokens directly from the DB.
async function getCalendarClientForUserId(userId: string) {
  const { data } = await supabase
    .from('email_accounts')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!data?.refresh_token) {
    throw new Error(`No active Google Calendar connection for user ${userId}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured on server.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: data.refresh_token });

  try {
    const { token } = await oauth2Client.getAccessToken();
    if (token) {
      await supabase
        .from('email_accounts')
        .update({
          token: { access_token: token, refresh_token: data.refresh_token },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active');
    }
  } catch {
    // Non-fatal: proceed with existing refresh token
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// google_event_id is stored as JSON: { attendeeId: gCalEventId, ... }
// This handles the legacy plain-string format from before the attendee-per-calendar model.
function parseAttendeeEventIds(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') return { legacy: parsed };
  } catch {
    // Not JSON — old plain string format
    return { legacy: raw };
  }
  return {};
}

// ── Event builders ────────────────────────────────────────────────────────────

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

  const lines: string[] = ['── SCHEDULE ──'];

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
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 30 },
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

// ── Meeting calendar CRUD ─────────────────────────────────────────────────────

// Syncs a meeting to the Google Calendars of all BCL attendees.
// google_event_id in the DB is stored as JSON: { attendeeId: gCalEventId }
export async function createGoogleCalendarEvent(
  meeting: MeetingEvent,
  bclAttendeeIds: string[] = [],
): Promise<string> {
  try {
    const eventPayload = buildCalendarEvent(meeting);
    const attendeeEventIds: Record<string, string> = {};
    let primaryMeetLink: string | null = null;

    for (const attendeeId of bclAttendeeIds) {
      try {
        const calendar = await getCalendarClientForUserId(attendeeId);
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventPayload,
          conferenceDataVersion: 1,
        });
        if (response.data?.id) {
          attendeeEventIds[attendeeId] = response.data.id;
          if (!primaryMeetLink && response.data?.hangoutLink) {
            primaryMeetLink = response.data.hangoutLink;
          }
        }
      } catch (err: any) {
        console.warn(`Could not sync meeting ${meeting.id_main} to calendar for attendee ${attendeeId}:`, err.message);
      }
    }

    // Fallback: if no BCL attendee had a connected calendar, use the requesting user's calendar
    if (Object.keys(attendeeEventIds).length === 0) {
      try {
        const calendar = await getGoogleCalendarClient();
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventPayload,
          conferenceDataVersion: 1,
        });
        if (response.data?.id) {
          attendeeEventIds['creator'] = response.data.id;
          primaryMeetLink = response.data?.hangoutLink || null;
        }
      } catch (err: any) {
        console.warn(`No calendar credentials available for meeting ${meeting.id_main} fallback:`, err.message);
      }
    }

    if (Object.keys(attendeeEventIds).length === 0) {
      throw new Error('No Google Calendar credentials available for any BCL attendee.');
    }

    const googleEventIdJson = JSON.stringify(attendeeEventIds);

    await supabase
      .from('bcl_meetings_meetings')
      .update({
        google_event_id: googleEventIdJson,
        google_meet_link: primaryMeetLink,
        ...(meeting.created_by ? { created_by: meeting.created_by } : {}),
        ...(meeting.updated_by ? { updated_by: meeting.updated_by } : {}),
      })
      .eq('id_main', meeting.id_main);

    return googleEventIdJson;
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
        notifications.push({ title: 'Meeting Reminder - 1 Hour', message: `Meeting with ${event.summary} starts in 1 hour`, meetingTime: eventTime, type: '1hour' });
      } else if (timeDiff <= 30 * 60 * 1000 && timeDiff > 29 * 60 * 1000) {
        notifications.push({ title: 'Meeting Reminder - 30 Minutes', message: `Meeting with ${event.summary} starts in 30 minutes`, meetingTime: eventTime, type: '30min' });
      } else if (timeDiff <= 10 * 60 * 1000 && timeDiff > 9 * 60 * 1000) {
        notifications.push({ title: 'Meeting Reminder - 10 Minutes', message: `Meeting with ${event.summary} starts in 10 minutes`, meetingTime: eventTime, type: '10min' });
      } else if (timeDiff <= 5 * 60 * 1000 && timeDiff > 4 * 60 * 1000) {
        notifications.push({ title: 'Meeting Reminder - 5 Minutes', message: `Meeting with ${event.summary} starts in 5 minutes!`, meetingTime: eventTime, type: '5min' });
      }
    }

    return notifications;
  } catch (error: any) {
    console.error('Error getting upcoming meetings:', error.message);
    return [];
  }
}

export async function updateGoogleCalendarEvent(
  meeting: MeetingEvent,
  bclAttendeeIds: string[] = [],
): Promise<string> {
  try {
    const { data: storedMeeting } = await supabase
      .from('bcl_meetings_meetings')
      .select('google_event_id, bcl_attendee')
      .eq('id_main', meeting.id_main)
      .single();

    if (!storedMeeting?.google_event_id) {
      // No existing sync — create instead
      const attendees = bclAttendeeIds.length > 0
        ? bclAttendeeIds
        : Array.isArray(storedMeeting?.bcl_attendee)
          ? (storedMeeting.bcl_attendee as any[]).map(String)
          : [];
      return createGoogleCalendarEvent(meeting, attendees);
    }

    const existingEventIds = parseAttendeeEventIds(storedMeeting.google_event_id);
    const eventPayload = buildCalendarEvent(meeting);
    const updatedEventIds: Record<string, string> = { ...existingEventIds };

    // Determine the current set of BCL attendees
    const currentAttendeeIds = bclAttendeeIds.length > 0
      ? bclAttendeeIds
      : Array.isArray(storedMeeting?.bcl_attendee)
        ? (storedMeeting.bcl_attendee as any[]).map(String)
        : Object.keys(existingEventIds).filter(k => k !== 'creator' && k !== 'legacy');

    // Update existing attendee events
    for (const [attendeeId, eventId] of Object.entries(existingEventIds)) {
      try {
        const calendar = (attendeeId === 'creator' || attendeeId === 'legacy')
          ? await getGoogleCalendarClient()
          : await getCalendarClientForUserId(attendeeId);

        const existing = await calendar.events.get({ calendarId: 'primary', eventId });
        const response = await calendar.events.update({
          calendarId: 'primary',
          eventId,
          requestBody: { ...existing.data, ...eventPayload },
          conferenceDataVersion: 1,
        });
        if (response.data?.id) updatedEventIds[attendeeId] = response.data.id;
      } catch (err: any) {
        console.warn(`Could not update calendar event for attendee ${attendeeId}:`, err.message);
      }
    }

    // Create events for newly added attendees that don't yet have a calendar entry
    for (const attendeeId of currentAttendeeIds) {
      if (updatedEventIds[attendeeId]) continue;
      try {
        const calendar = await getCalendarClientForUserId(attendeeId);
        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventPayload,
          conferenceDataVersion: 1,
        });
        if (response.data?.id) updatedEventIds[attendeeId] = response.data.id;
      } catch (err: any) {
        console.warn(`Could not create calendar event for new attendee ${attendeeId}:`, err.message);
      }
    }

    const googleEventIdJson = JSON.stringify(updatedEventIds);

    await supabase
      .from('bcl_meetings_meetings')
      .update({
        google_event_id: googleEventIdJson,
        ...(meeting.updated_by ? { updated_by: meeting.updated_by } : {}),
      })
      .eq('id_main', meeting.id_main);

    return googleEventIdJson;
  } catch (error: any) {
    console.error('Error updating Google Calendar event:', error.message);
    throw error;
  }
}

export async function deleteGoogleCalendarEvent(meetingId: number): Promise<void> {
  try {
    const { data: meetingData } = await supabase
      .from('bcl_meetings_meetings')
      .select('google_event_id')
      .eq('id_main', meetingId)
      .single();

    if (!meetingData?.google_event_id) return;

    const eventIds = parseAttendeeEventIds(meetingData.google_event_id);

    for (const [attendeeId, eventId] of Object.entries(eventIds)) {
      try {
        const calendar = (attendeeId === 'creator' || attendeeId === 'legacy')
          ? await getGoogleCalendarClient()
          : await getCalendarClientForUserId(attendeeId);

        await calendar.events.delete({ calendarId: 'primary', eventId });
      } catch (err: any) {
        console.warn(`Could not delete calendar event for attendee ${attendeeId}:`, err.message);
      }
    }

    await supabase
      .from('bcl_meetings_meetings')
      .update({ google_event_id: null, google_meet_link: null })
      .eq('id_main', meetingId);
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
        const attendeeIds: string[] = Array.isArray(meeting.bcl_attendee)
          ? (meeting.bcl_attendee as any[]).map(String)
          : [];
        await createGoogleCalendarEvent(meeting, attendeeIds);
        console.log(`Synced meeting ${meeting.id_main} to Google Calendar`);
      } catch (error) {
        console.error(`Failed to sync meeting ${meeting.id_main}:`, error);
      }
    }
  } catch (error: any) {
    console.error('Error in syncMeetingsToCalendar:', error.message);
  }
}

// ── BCL Events  (weddings, fundraisers, tech events, etc.) ───────────────────

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
