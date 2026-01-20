-- ==========================================
-- SUPABASE CRON JOB SETUP
-- ==========================================

-- Enable the pg_net extension to make HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 10 minutes
-- This resolution is enough to catch the 1hr and 5min windows and the morning/weekly report times
SELECT cron.schedule(
  'process-reminders', -- name of the cron job
  '*/10 * * * *',      -- every 10 minutes
  $$
  SELECT net.http_post(
    url:='https://<your-project-ref>.supabase.co/functions/v1/scheduler',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- To view all scheduled jobs:
-- SELECT * FROM cron.job;

-- To unschedule the job:
-- SELECT cron.unschedule('process-reminders');

-- ==========================================
-- MANUAL TESTING QUERIES
-- ==========================================

-- Test the scheduler function manually:
-- SELECT net.http_post(
--   url:='https://<your-project-ref>.supabase.co/functions/v1/scheduler',
--   headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb,
--   body:='{}'::jsonb
-- );

-- Check reminder logs:
-- SELECT * FROM bcl_meetings_reminder_logs ORDER BY sent_at DESC LIMIT 10;

-- Check system settings:
-- SELECT * FROM bcl_meetings_system_settings;

-- Update settings (examples):
-- UPDATE bcl_meetings_system_settings SET value = 'false' WHERE key = 'enable_morning_report';
-- UPDATE bcl_meetings_system_settings SET value = 'YOUR_ACTUAL_API_KEY' WHERE key = 'whatsapp_api_key';
