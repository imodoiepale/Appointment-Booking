-- ─────────────────────────────────────────────────────────────────────────────
-- bcl_events — standalone events (weddings, fundraisers, tech events, etc.)
-- Run this migration in your Supabase SQL editor or via CLI.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bcl_events (
  id                  BIGSERIAL PRIMARY KEY,
  event_name          VARCHAR    NOT NULL,
  event_type          VARCHAR    NOT NULL DEFAULT 'other',
  event_date          VARCHAR    NOT NULL,
  event_day           VARCHAR,
  event_start_time    VARCHAR    NOT NULL,
  event_end_time      VARCHAR    NOT NULL,
  event_duration      INTEGER,
  event_venue         VARCHAR,
  event_venue_area    VARCHAR,
  event_description   TEXT,
  organizer_name      VARCHAR,
  organizer_company   VARCHAR,
  organizer_email     VARCHAR,
  organizer_mobile    VARCHAR,
  bcl_attendee        TEXT       DEFAULT '[]',
  bcl_attendee_mobile VARCHAR,
  expected_attendees  INTEGER    DEFAULT 0,
  status              VARCHAR    DEFAULT 'upcoming',
  badge_status        VARCHAR    DEFAULT 'Open',
  google_event_id     VARCHAR,
  created_by          VARCHAR,
  updated_by          VARCHAR,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bcl_events_event_date  ON public.bcl_events (event_date);
CREATE INDEX IF NOT EXISTS idx_bcl_events_status      ON public.bcl_events (status);
CREATE INDEX IF NOT EXISTS idx_bcl_events_created_by  ON public.bcl_events (created_by);

-- Reuse the set_updated_at trigger function if it already exists, otherwise create it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_bcl_events_updated_at ON public.bcl_events;
CREATE TRIGGER set_bcl_events_updated_at
  BEFORE UPDATE ON public.bcl_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
