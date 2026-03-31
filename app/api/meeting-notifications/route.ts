import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingMeetingsWithNotifications } from '@/utils/googleCalendarService';

export async function GET(request: NextRequest) {
  try {
    const notifications = await getUpcomingMeetingsWithNotifications();
    
    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Error fetching meeting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
