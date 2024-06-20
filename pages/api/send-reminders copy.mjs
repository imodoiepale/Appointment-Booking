import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Pusher configuration
const pusherInstance = '99223496-fec8-46d8-85b1-bd730fbbf802';
const pusherSecret = '7E56D0CAD5A786EE1B38A976667989050745E2661653495EC5EBD8BE360A5A20';

// Supabase configuration
const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getNextMeeting() {
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('*')
    .order('id_main',72)
    .limit(1);

  if (error) {
    console.error('Error fetching meetings:', error);
    return null;
  }
  return meetings
}



async function scheduleReminder() {
  const meeting = await getNextMeeting();

  console.log(meeting)

  if (!meeting) {
    console.log('No upcoming meetings found.');
    return;
  }

     sendReminder(meeting);
    console.log(`Scheduled reminder for meeting with ${meeting.client_name} in ${timeUntilReminder / 1000} seconds.`);

}

async function sendReminder(meeting) {
  const payload = {
    interests: ['hello'],
    web: {
      notification: {
        title: 'Upcoming Meeting',
        body: `${meeting[0].meeting_start_time} - ${meeting[0].meeting_end_time} meeting with ${meeting[0].client_name} from ${meeting[0].client_company} on ${meeting[0].meeting_date}`,
      },
    },
  };

  try {
    await fetch(`https://${pusherInstance}.pushnotifications.pusher.com/publish_api/v1/instances/${pusherInstance}/publishes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pusherSecret}`,
      },
      body: JSON.stringify(payload),
    });
    console.log(`Sent reminder for meeting with ${meeting[0].client_name} on ${meeting[0].meeting_date}`);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// Schedule the task to check for the next meeting every minute
cron.schedule('* * * * *', scheduleReminder);