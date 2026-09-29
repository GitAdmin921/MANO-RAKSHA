-- V30: user-controlled admin phone visibility.
-- Run once in Supabase SQL Editor BEFORE uploading the V30 frontend.
alter table public.profiles
  add column if not exists allow_admin_contact boolean not null default false;

-- Existing profile RLS already permits each user to update their own profile
-- and authorized staff to read profiles. The UI displays phone numbers only
-- when the user has opted in. Never grant public/anonymous profile access.
