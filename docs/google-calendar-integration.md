# Google Calendar Integration

This feature allows you to sync your meetings with Google Calendar and receive notifications before your appointments.

## Features

- ✅ **Sync meetings to Google Calendar** with one click
- ✅ **Automatic notifications** (1 hour, 30 min, 10 min, 5 min before meetings)
- ✅ **Virtual meeting links** automatically generated for virtual meetings
- ✅ **Real-time notifications** in the navbar
- ✅ **Two-way sync** between your app and Google Calendar

## Setup Instructions

### 1. Connect Google Calendar

1. Open your appointment dashboard
2. Click the **"Connect Google Calendar"** button in the header
3. Sign in with your Google account
4. Grant calendar permissions
5. You'll be redirected back to the app with a success message

### 2. Sync Individual Meetings

1. Find any meeting card in your dashboard
2. Click the **"Sync"** button at the bottom of the card
3. The meeting will be added to your Google Calendar
4. You'll receive a confirmation notification

### 3. Automatic Notifications

Once connected, you'll receive notifications in the navbar:
- 🔔 **1 hour before** meeting
- 🔔 **30 minutes before** meeting  
- 🔔 **10 minutes before** meeting
- 🔔 **5 minutes before** meeting

## Technical Details

### API Endpoints

- `GET /api/auth/google` - Starts Google OAuth flow
- `GET /api/auth/google/callback` - Handles OAuth callback
- `POST /api/sync-to-calendar` - Syncs a meeting to Google Calendar
- `GET /api/meeting-notifications` - Gets upcoming meeting notifications

### Components

- `NotificationSystem.tsx` - Notification management
- `googleCalendarService.ts` - Google Calendar API integration
- `Header.tsx` - Updated with notification bell

### Database Updates

The system automatically updates your Supabase database with:
- `google_event_id` - Google Calendar event ID
- `google_meet_link` - Google Meet link (for virtual meetings)

## Troubleshooting

### "Google Calendar not connected" error
- Click "Connect Google Calendar" button in the dashboard header
- Ensure you complete the OAuth flow

### Sync failed
- Check your internet connection
- Verify you have granted calendar permissions
- Try reconnecting Google Calendar

### Notifications not showing
- Ensure Google Calendar is connected
- Check that meetings have valid dates/times
- Refresh the page

## Security Notes

- Access tokens are stored in secure httpOnly cookies
- Tokens expire after 1 week for security
- Only calendar permissions are requested
- No other Google services are accessed

## Development

To modify the integration:

1. Update Google OAuth credentials in `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```

2. Modify notification times in `googleCalendarService.ts`

3. Add new notification types in `NotificationSystem.tsx`

## Future Enhancements

- [ ] Bulk sync all meetings
- [ ] Calendar view in dashboard
- [ ] Email notifications
- [ ] Mobile push notifications
- [ ] Recurring meeting support
