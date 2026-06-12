-- Migration: add missing columns to third_party_contacts
-- Run this against: zyszsqgdlrpnunkegipk.supabase.co

-- 1. organization_name: the company/organisation the contact represents
alter table public.third_party_contacts
  add column if not exists organization_name text null;

-- 2. Ensure contact_type has a sensible default set of values (no enum — kept as free-text for flexibility)
--    Suggested values used in the UI: Bank, Software Provider, Vendor, Legal / Regulatory, Consultant, Other

-- 3. Index on contact_type already exists (idx_third_party_contacts_contact_type)
--    Add index on organization_name for quick lookups
create index if not exists idx_third_party_contacts_org_name
  on public.third_party_contacts using btree (organization_name)
  tablespace pg_default;

-- 4. Auto-update updated_at on row changes (if trigger doesn't already exist)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_third_party_contacts_updated_at'
      and tgrelid = 'public.third_party_contacts'::regclass
  ) then
    create trigger trg_third_party_contacts_updated_at
      before update on public.third_party_contacts
      for each row execute function public.set_updated_at();
  end if;
end;
$$;
