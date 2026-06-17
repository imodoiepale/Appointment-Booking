-- Migration: replace fixed boolean reminder columns with flexible JSONB arrays
-- This allows users to add any number of custom reminder offsets (minutes before start).

-- Drop fixed-time boolean columns for meetings
alter table public.notification_settings
    drop column if exists meeting_1hr,
    drop column if exists meeting_30min,
    drop column if exists meeting_at_start;

-- Drop fixed-time boolean columns for events
alter table public.notification_settings
    drop column if exists event_1hr,
    drop column if exists event_30min;

-- Add flexible reminder arrays
-- Values are integers representing minutes before slot/start time.
-- 0 = at departure/start time, 60 = 1 hour before, etc.
alter table public.notification_settings
    add column if not exists meeting_custom_reminders jsonb not null default '[60, 30, 0]'::jsonb,
    add column if not exists event_custom_reminders   jsonb not null default '[60, 30]'::jsonb;

-- Back-fill existing rows that didn't get the default (shouldn't be needed but safe)
update public.notification_settings
    set meeting_custom_reminders = '[60, 30, 0]'::jsonb
    where meeting_custom_reminders is null;

update public.notification_settings
    set event_custom_reminders = '[60, 30]'::jsonb
    where event_custom_reminders is null;
