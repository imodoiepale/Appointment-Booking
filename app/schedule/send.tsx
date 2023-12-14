"use server"


import { auth } from '@clerk/nextjs';
import { google } from 'googleapis';
import clerk from '@clerk/clerk-sdk-node';

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
  meetingType: string;
}

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export async function addEvent(formData: FormData): Promise<string | undefined> {
  const { userId } = auth();

  // Retrieve the Google access token for the authenticated user
  const [oauthAccessToken] = await clerk.users.getUserOauthAccessToken(userId, 'oauth_google');
  const { token } = oauthAccessToken;

  // Create a new OAuth2 client with the Google access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });

  // Create a new calendar instance
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Define the event
  const event: google.calendar_v3.Schema.Event = {
    summary: `${formData.meetingAgenda} with ${formData.clientName} from ${formData.clientCompany}`,
    description: `Scheduled meeting from ${formData.meetingStartTime} to ${formData.meetingEndTime}. Slot: ${formData.meetingSlotStartTime} - ${formData.meetingSlotEndTime}`,
    location: formData.meetingVenueArea,
    start: {
      dateTime: `${formData.meetingDate}T${formData.meetingStartTime}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    end: {
      dateTime: `${formData.meetingDate}T${formData.meetingEndTime}:00+03:00`,
      timeZone: 'Africa/Nairobi',
    },
    attendees: [
      { email: formData.clientEmail },
      { email: 'jeimodoi@gmail.com' },
    ],
    conferenceData: formData.meetingType === 'virtual'
      ? {
        createRequest: {
          requestId: Math.random().toString(36).substring(2),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      }
      : undefined,
  };

  // Insert the event
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    console.log(response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Error creating event:', error.message);
    return undefined;
  }
}
