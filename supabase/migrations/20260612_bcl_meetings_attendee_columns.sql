alter table public.bcl_meetings_meetings
  add column if not exists client_attendees jsonb null;

alter table public.bcl_meetings_meetings
  add column if not exists third_party_attendees jsonb null;

create index if not exists idx_bcl_meetings_client_attendees
  on public.bcl_meetings_meetings using gin (client_attendees)
  tablespace pg_default;

create index if not exists idx_bcl_meetings_third_party_attendees
  on public.bcl_meetings_meetings using gin (third_party_attendees)
  tablespace pg_default;
