-- MANORAKSHA V16 — data hardening migration for an existing project.
-- Existing V15 database: run this migration first, then run the updated supabase/schema.sql so the V16 policies/functions/realtime rules are applied.
-- Fresh database: run supabase/schema.sql only.

-- 1) User-local calendar dates for mood/check-in graphs.
alter table public.mood_entries add column if not exists entry_date date;
alter table public.checkins add column if not exists entry_date date;
update public.profiles set timezone = 'Asia/Kolkata' where timezone is null or trim(timezone) = '';
update public.mood_entries m set entry_date = ((m.created_at at time zone coalesce(p.timezone,'Asia/Kolkata'))::date) from public.profiles p where p.id=m.user_id and m.entry_date is null;
update public.checkins c set entry_date = ((c.created_at at time zone coalesce(p.timezone,'Asia/Kolkata'))::date) from public.profiles p where p.id=c.user_id and c.entry_date is null;
with ranked as (select id,row_number() over(partition by user_id,entry_date order by created_at desc,id desc) rn from public.mood_entries where entry_date is not null) delete from public.mood_entries m using ranked r where m.id=r.id and r.rn>1;
with ranked as (select id,row_number() over(partition by user_id,entry_date order by created_at desc,id desc) rn from public.checkins where entry_date is not null) delete from public.checkins c using ranked r where c.id=r.id and r.rn>1;
alter table public.mood_entries alter column entry_date set not null;
alter table public.checkins alter column entry_date set not null;
create unique index if not exists mood_entries_user_entry_date_key on public.mood_entries(user_id,entry_date);
create unique index if not exists checkins_user_entry_date_key on public.checkins(user_id,entry_date);
create index if not exists mood_entries_user_date_idx on public.mood_entries(user_id,entry_date desc);
create index if not exists checkins_user_date_idx on public.checkins(user_id,entry_date desc);

-- 2) Rename misleading wellness column and point it to profiles consistently.
create table if not exists public.wellness_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.wellness_activities(id) on delete cascade,
  assigned_date date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,assigned_date)
);
alter table public.wellness_assignments add column if not exists assigned_date date;

-- Older V15 databases used assigned_month even though it stored one day.
-- Guard the reference so this migration is safe on databases already using assigned_date.
do $migration$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='wellness_assignments' and column_name='assigned_month') then
    execute $sql$
      update public.wellness_assignments
      set assigned_date = coalesce(assigned_date, assigned_month, created_at::date)
      where assigned_date is null
    $sql$;
  else
    execute $sql$
      update public.wellness_assignments
      set assigned_date = coalesce(assigned_date, created_at::date)
      where assigned_date is null
    $sql$;
  end if;
end
$migration$;

with ranked as (select id,row_number() over(partition by user_id,assigned_date order by created_at desc,id desc) rn from public.wellness_assignments where assigned_date is not null)
delete from public.wellness_assignments w using ranked r where w.id=r.id and r.rn>1;
alter table public.wellness_assignments alter column assigned_date set not null;
create unique index if not exists wellness_assignments_user_date_key on public.wellness_assignments(user_id,assigned_date);
drop index if exists wellness_assignments_user_date_idx;
create index if not exists wellness_assignments_user_date_idx on public.wellness_assignments(user_id,assigned_date desc);
alter table public.wellness_assignments drop constraint if exists wellness_assignments_user_id_fkey;
alter table public.wellness_assignments add constraint wellness_assignments_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.wellness_assignments drop column if exists assigned_month;

-- 3) Recreate the policies/functions needed by V16.
