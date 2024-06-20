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

// Schedule reminders for 24 hours, 4 hours, 2 hours, 1 hour, and 15 minutes before the meeting
cron.schedule('0 0 * * *', () => sendReminders(24 * 60)); // 24 hours before
cron.schedule('0 */4 * * *', () => sendReminders(240)); // 4 hours before
cron.schedule('0 */2 * * *', () => sendReminders(120)); // 2 hours before
cron.schedule('0 * * * *', () => sendReminders(60)); // 1 hour before
cron.schedule('*/15 * * * *', () => sendReminders(15)); // 15 minutes before

async function sendReminders(minutesBeforeMeeting) {
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('*')
    .gt('meeting_start_time', new Date(Date.now() + minutesBeforeMeeting * 60 * 1000).toISOString())
    .gte('meeting_date', new Date().toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching meetings:', error);
    return;
  }

  for (const meeting of meetings) {
    const payload = {
      interests: ['hello'],
      web: {
        notification: {
          title: 'MEETINGS',
          body: `${meeting.meeting_start_time} - ${meeting.meeting_end_time} meeting with ${meeting.client_name} from ${meeting.client_company} on ${meeting.meeting_date}`,
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
      console.log(`Sent reminder for meeting with ${meeting.client_name} on ${meeting.meeting_date}`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
}
