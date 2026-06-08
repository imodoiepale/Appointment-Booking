-- ─────────────────────────────────────────────────────────────────────────────
-- Add virtual/physical + travel-buffered slot fields to bcl_events, and
-- virtual meeting link/mode fields to bcl_events + bcl_meetings_meetings.
-- Run this migration in your Supabase SQL editor or via CLI.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.bcl_events
  ADD COLUMN IF NOT EXISTS event_slot_start_time VARCHAR,
  ADD COLUMN IF NOT EXISTS event_slot_end_time   VARCHAR,
  ADD COLUMN IF NOT EXISTS venue_distance        INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS event_format          VARCHAR DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS virtual_meeting_mode  VARCHAR,
  ADD COLUMN IF NOT EXISTS meeting_link          VARCHAR,
  ADD COLUMN IF NOT EXISTS meeting_id            VARCHAR,
  ADD COLUMN IF NOT EXISTS google_meet_link      VARCHAR;

ALTER TABLE public.bcl_meetings_meetings
  ADD COLUMN IF NOT EXISTS virtual_meeting_mode  VARCHAR,
  ADD COLUMN IF NOT EXISTS meeting_link          VARCHAR,
  ADD COLUMN IF NOT EXISTS meeting_id            VARCHAR;
