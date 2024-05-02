//@ts-nocheck
//@ts-ignore

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const supabaseUrl = 'https://zyszsqgdlrpnunkegipk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c3pzcWdkbHJwbnVua2VnaXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzMjc4OTQsImV4cCI6MjAyMzkwMzg5NH0.fK_zR8wR6Lg8HeK7KBTTnyF0zoyYBqjkeWeTKqi32ws';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure web-push
webPush.setVapidDetails(
  'mailto:your-email@example.com',
  'BBoQxdK2jaBHVraazx5rc9-9LjQIqKXC_viyGjQH9iLbdFDbUvQBl-MPMMqUFu-nhxe0TVwcusaR1MUJqxLIc3Q',
  'sVQhQTIiuL6R_3bbkYt1JIOyRYszQs_Ie8C9VtnBhOs'
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await scheduleMeetingNotifications();
    res.status(200).json({ message: 'Notifications scheduled' });
  } catch (error) {
    console.error('Error scheduling notifications:', error);
    res.status(500).json({ message: 'Error scheduling notifications' });
  }
}

async function scheduleMeetingNotifications() {
  // Fetch upcoming meetings from Supabase
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('status', 'upcoming') // Or any relevant filter
    .gt('meeting_start_time', new Date()); // Filter for future meetings

  if (error) {
    console.error('Error fetching meetings:', error);
    return;
  }

  for (const meeting of meetings) {
    const meetingStartTime = new Date(meeting.meeting_start_time);
    const notificationTimes = [
      meetingStartTime - 2 * 60 * 60 * 1000, // 2 hours before
      meetingStartTime - 30 * 60 * 1000,  // 30 minutes before
      meetingStartTime - 10 * 60 * 1000,  // 10 minutes before
      meetingStartTime - 5 * 60 * 1000,  // 5 minutes before
      // ... add other intervals
    ];

    for (const notificationTime of notificationTimes) {
      scheduleNotification(meeting, notificationTime);
    }
  }
}

async function scheduleNotification(meeting, notificationTime) {
  const delay = notificationTime - Date.now();

  setTimeout(async () => {
    // Fetch subscriptions from Supabase
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }

    // Send notifications
    for (const { subscription } of subscriptions) {
      const payload = JSON.stringify({
        title: `Upcoming Meeting with ${meeting.client_name}`,
        body: `Meeting at ${meeting.meeting_start_time}`,
        // ... other data
      });

      try {
        await webPush.sendNotification(subscription, payload);
      } catch (error) {
        // Handle errors (e.g., remove invalid subscriptions)
      }
    }
  }, delay);
}