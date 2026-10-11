-- Required by the profile onboarding and privacy settings UI.
-- Run in Supabase SQL Editor before deploying the frontend update.
alter table public.profiles
  add column if not exists allow_admin_contact boolean not null default false;
