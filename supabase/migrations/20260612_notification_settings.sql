-- Migration: per-user notification preferences
-- Run against: zyszsqgdlrpnunkegipk.supabase.co

create table if not exists public.notification_settings (
  user_id       uuid primary key,
  -- Meeting notifications (all based on meeting_slot_start_time for physical, start_time for virtual)
  meeting_enabled       boolean not null default true,
  meeting_1hr           boolean not null default true,   -- 60 min before slot/start
  meeting_30min         boolean not null default true,   -- 30 min before slot/start
  meeting_at_start      boolean not null default true,   -- at meeting_start_time
  meeting_end_alert     boolean not null default true,   -- 10 min before end (with extend actions)
  -- Birthday notifications
  birthday_enabled      boolean not null default true,
  birthday_2days_before boolean not null default true,   -- 2 business days before at 09:00
  birthday_day_of       boolean not null default true,   -- day-of at 09:00
  -- Event notifications
  event_enabled         boolean not null default true,
  event_1hr             boolean not null default true,
  event_30min           boolean not null default true,
  -- Metadata
  updated_at            timestamptz not null default now()
);

create or replace trigger trg_notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- RLS: each user only reads/writes their own row
alter table public.notification_settings enable row level security;

create policy "users manage own notification settings"
  on public.notification_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
