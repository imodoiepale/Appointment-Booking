-- EFNS push: ping every phone the moment a new immigration row lands.
--
-- WHY: the EFNS notifications have no schedule — the automation's hourly scrape writes
-- immigration_notifications / immigration_payments whenever it finds something, so there is no clock
-- to set an Android alarm against. The app can only find them by polling, and Android defers
-- background polling until the user happens to open the app. This trigger closes that gap: insert →
-- POST /api/push/efns → one high-priority FCM data message → the app runs its existing
-- EfnsAlerts.check() and posts a grouped notification. Works with the app closed.
--
-- TO APPLY (project zyszsqgdlrpnunkegipk, shared by EFNS-AUTOMATIONS / Appointment-Booking /
-- accounting-task-manager):
--   1. Make a long random string (openssl rand -hex 32) and set it as EFNS_PUSH_SECRET on the
--      meetings deployment (Vercel → Settings → Environment Variables), then redeploy. The endpoint
--      answers 503 until you do.
--   2. Store the SAME value in Supabase Vault — in the SQL editor, never in this file:
--        select vault.create_secret('<the secret>', 'efns_push_secret');
--      (to rotate later: select vault.update_secret(
--         (select id from vault.secrets where name = 'efns_push_secret'), '<new secret>');)
--   3. Run this file in the SQL editor. Everything is idempotent, so re-running is safe.
--
-- The secret is read from Vault at trigger time, so it never sits in the repo or in the function's
-- source (pg_proc). Without the Vault entry the trigger sends no header and the endpoint answers 401
-- — inserts are never blocked either way.
--
-- Alternative to steps 1+3: a Dashboard "Database Webhook" on the two tables pointing at
-- https://meetings.booksmartportals.com/api/push/efns with header x-bcl-push-secret — same effect
-- (Database Webhooks are this same pg_net trigger, created for you).

-- The extension creates its own schema named "net"; registering it in "extensions" keeps it out of
-- public and satisfies the Security Advisor.
create extension if not exists pg_net with schema extensions;

-- ─── 1. Devices ────────────────────────────────────────────────────────────────────────────────
-- Written by POST /api/push/devices (the Android app registering its FCM token), read by
-- /api/push/efns. Rows are deleted again when FCM reports the token dead.
create table if not exists public.bcl_push_devices (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,
  fcm_token   text        not null,
  app         text        not null,
  platform    text        not null default 'android',
  device_info jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (app, fcm_token)
);

create index if not exists bcl_push_devices_app_idx on public.bcl_push_devices (app);

-- ─── 2. Cursor ─────────────────────────────────────────────────────────────────────────────────
-- "How far we have already announced". One row (id = 1). The defaults are now(), so the very first
-- run starts at the present instead of replaying the whole back catalogue as a notification.
create table if not exists public.bcl_push_cursor (
  id                        int         primary key check (id = 1),
  last_notification_pushed_at timestamptz not null default now(),
  last_payment_pushed_at      timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- The endpoint talks to both with the service-role key (which bypasses RLS); nobody else needs in.
alter table public.bcl_push_devices enable row level security;
alter table public.bcl_push_cursor   enable row level security;

-- ─── 3. Trigger ────────────────────────────────────────────────────────────────────────────────
-- pg_net is asynchronous: the INSERT is never held up waiting for the HTTP call to come back, and
-- the call itself only starts once the transaction commits.
create or replace function public.bcl_efns_push_signal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_id bigint;
  push_secret text;
begin
  select decrypted_secret into push_secret
    from vault.decrypted_secrets
   where name = 'efns_push_secret'
   limit 1;

  select net.http_post(
    url := 'https://meetings.booksmartportals.com/api/push/efns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bcl-push-secret', coalesce(push_secret, '')
    ),
    body := jsonb_build_object('table', tg_table_name, 'record_id', to_jsonb(new.id)),
    timeout_milliseconds := 5000
  ) into request_id;

  return new;
end;
$$;

-- The EFNS automation writes with the anon key, so it needs to be able to call this.
grant execute on function public.bcl_efns_push_signal() to anon, authenticated, service_role;

drop trigger if exists bcl_efns_push_signal on public.immigration_notifications;
create trigger bcl_efns_push_signal
  after insert on public.immigration_notifications
  for each row execute function public.bcl_efns_push_signal();

drop trigger if exists bcl_efns_push_signal on public.immigration_payments;
create trigger bcl_efns_push_signal
  after insert on public.immigration_payments
  for each row execute function public.bcl_efns_push_signal();

-- ─── Testing / debugging ───────────────────────────────────────────────────────────────────────
-- After a run of the automation:
--   select * from net._http_response order by created desc limit 10;   -- status of each call
--   select * from public.bcl_push_cursor;                              -- should be ~now()
--   select count(*) from public.bcl_push_devices;                      -- registered phones
-- To go again from scratch (phones will not be re-notified about old rows afterwards):
--   update public.bcl_push_cursor
--      set last_notification_pushed_at = now(), last_payment_pushed_at = now(), updated_at = now()
--    where id = 1;
