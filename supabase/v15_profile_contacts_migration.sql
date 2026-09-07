-- MANORAKSHA V15 — profile details, verified professional directory
-- Run this once in the existing Supabase project.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists age smallint;

alter table public.profiles
  drop constraint if exists profiles_age_check;

alter table public.profiles
  add constraint profiles_age_check check (age is null or age between 13 and 120);

create table if not exists public.professional_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  organization text,
  email text,
  phone text,
  website text,
  location text,
  verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.professional_contacts enable row level security;

drop policy if exists "professional_contacts_authenticated_read" on public.professional_contacts;
create policy "professional_contacts_authenticated_read"
on public.professional_contacts
for select
using (auth.uid() is not null and is_active = true);

drop policy if exists "professional_contacts_staff_manage" on public.professional_contacts;
create policy "professional_contacts_staff_manage"
on public.professional_contacts
for all
using (public.is_staff())
with check (public.is_staff());

grant select on public.professional_contacts to authenticated;
grant insert, update, delete on public.professional_contacts to authenticated;

-- Realtime is not required for directory reads; changes are visible on next page refresh.
