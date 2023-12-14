"use server"

import { auth } from '@clerk/nextjs';
import { google } from 'googleapis';
import clerk from '@clerk/clerk-sdk-node';
import { createClient } from '@supabase/supabase-js';
import { ChangeEvent } from 'react';


const supabaseUrl = 'https://qnfoxdfnevcjxqpkjcwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZm94ZGZuZXZjanhxcGtqY3dtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5OTk2MTE1OCwiZXhwIjoyMDE1NTM3MTU4fQ.-U2eC5IP7Xr6Uc4EXCKjXUIbJq9srz7pDf7b1UbYiJo';
const supabase = createClient(supabaseUrl, supabaseKey);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];


export async function cancelEvent(formData) {
  const { userId } = auth(formData);

  // Retrieve the Google access token for the authenticated user
  const [oauthAccessToken] = await clerk.users.getUserOauthAccessToken(userId, 'oauth_google');
  const { token } = oauthAccessToken;

  // Create a new OAuth2 client with the Google access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });

  // Create a new calendar instance
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Fetch the Google event ID from the "events" table in Supabase
  const { data, error } = await supabase
    .from('events')
    .select('google_event_id')
    .eq('id', formData.eventId); // Use the event ID from formData

  if (error) {
    console.error('Error fetching Google event ID:', error.message);
    return;
  }

  const googleEventId = data[0].google_event_id; // The Google event ID

  // Delete the event
  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });

    console.log('Event deleted successfully');
  } catch (error) {
    console.error('Error deleting event:', error.message);
  }
}
