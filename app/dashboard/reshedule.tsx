"use server"
import { auth } from '@clerk/nextjs';
import { google } from 'googleapis';
import clerk from '@clerk/clerk-sdk-node';


const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export async function rescheduleEvent(formData, eventId) {
    const { userId } = auth(formData);

  // Retrieve the Google access token for the authenticated user
  const [oauthAccessToken] = await clerk.users.getUserOauthAccessToken(userId, 'oauth_google');
  const { token } = oauthAccessToken;

  // Create a new OAuth2 client with the Google access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });

  // Create a new calendar instance
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Define the updated event
  const updatedEvent  = {
    summary: `${formData.meetingAgenda} with ${formData.clientName} from ${formData.clientCompany}`,
    description: `Scheduled meeting from ${formData.meetingStartTime} to ${formData.meetingEndTime}. Slot: ${formData.meetingSlotStartTime} - ${formData.meetingSlotEndTime}`,
    location: formData.meetingVenueArea,
    start: {
        dateTime: `${formData.meetingDate}T${formData.meetingStartTime}:00+03:00`, // Replace with your start date and time
        timeZone: 'Africa/Nairobi',
        },
    end: {
        dateTime: `${formData.meetingDate}T${formData.meetingEndTime}:00+03:00`, // Replace with your end date and time
        timeZone: 'Africa/Nairobi',
        },
  };

  // Insert the event
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

  } catch (error) {
    console.error('Error creating event:', error.message);
  }
}
