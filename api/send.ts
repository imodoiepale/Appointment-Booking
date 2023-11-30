

"use server";

import { google } from 'googleapis';
import { Clerk } from '@clerk/clerk-sdk-node';

const clerk = new Clerk({ apiKey: 'sk_test_RihG8CjG1yFhHS7ET7r3nUOEmvA1klo0d5Rxwk8amsy' });

export async function createEvent(userId, event) {
  try {
    // Get the user's Google access token from Clerk
    const user = await clerk.users.getUser(userId);
    const googleAccessToken = user.publicMetadata.googleAccessToken;

    // Create an OAuth2 client and set the access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: googleAccessToken });

    // Create an event in the user's primary calendar
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('Event created: %s', response.data.htmlLink);
  } catch (err) {
    console.log('Error creating event:', err);
    throw err; // Propagate the error to the caller
  }
}
