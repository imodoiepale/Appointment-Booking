// --- Appointment Interface ---
export interface Appointment {
  id_main: number;
  meeting_start_time: string;
  meeting_duration: number;
  meeting_end_time: string;
  meeting_date: string;
  meeting_day: string;
  status: string;
  booking_date: string;
  booking_day: string;
  client_name: string;
  client_company: string;
  client_mobile: string;
  meeting_venue_area: string;
  meeting_type: string;
  meeting_agenda: string;
  bcl_attendee: string;
  bcl_attendee_mobile: string;
  venue_distance: string;
  meeting_slot_start_time: string;
  meeting_slot_end_time: string;
  badge_status: string;
  google_event_id: string;
  google_meet_link: string;
  created_by: string;
  updated_by: string;
}

export interface AuthUser {
  id?: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
}

export type CalendarConnectionStatus = 'checking' | 'connected' | 'disconnected';
