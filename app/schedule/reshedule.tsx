"use server"

import { auth } from '@clerk/nextjs';
import { google } from 'googleapis';
import clerk from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';


interface FormData {
  eventId: number;
  meetingStartTime: string;
  meetingEndTime: string;
  meetingDate: string;
  // Add other properties as needed
}


const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export async function updateEvent(formData: FormData): Promise<string | undefined> {
   const { userId } = auth();

  if (userId === null) {
    console.error('User is not authenticated.');
    return undefined;
  }

  const [oauthAccessToken] = await clerk.users.getUserOauthAccessToken(userId, 'oauth_google');

  if (!oauthAccessToken || !oauthAccessToken.token) {
    throw new Error('User oauthAccessToken is null, undefined, or missing the token property.');
  }

  const { token } = oauthAccessToken;

  // Create a new OAuth2 client with the Google access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });

  // Create a new calendar instance
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Fetch the Google event ID from the "events" table in Supabase
  const { data, error } = await supabase
    .from('meetings')
    .select('google_event_id')
    .eq('id', formData.eventId)

  if (error) {
    console.error('Error fetching Google event ID:', error.message);
    return;
  }

  const googleEventId = data[0].google_event_id; // The Google event ID

  const currentEventResponse = await calendar.events.get({
    calendarId: 'primary',
    eventId: googleEventId,
  });

  const currentEvent = currentEventResponse.data ;

  // Define the updated event
  const event= {
    ...currentEvent,
    description: `Scheduled meeting from ${formData.meetingStartTime} to ${formData.meetingEndTime}`,
    start: {
      dateTime: `${formData.meetingDate}T${formData.meetingStartTime}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    end: {
      dateTime: `${formData.meetingDate}T${formData.meetingEndTime}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
  };

  // Update the event
  try {
  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId: googleEventId, // Use the Google event ID
    requestBody: event,
  });
} catch (error:any) {
  console.error('Error updating event:', error.message);
}
}