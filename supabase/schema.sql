-- MANORAKSHA V16 — idempotent security/data foundation
-- Safe to rerun. Existing project data is preserved except duplicate same-day
-- mood/check-in rows, where the newest row is retained before the unique rule.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  gender text check (gender in ('female','male','other')),
  preferred_language text default 'en',
  timezone text,
  avatar_path text,
  phone text,
  age smallint check (age is null or age between 13 and 120),
  consent_version text,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists age smallint;
alter table public.profiles add column if not exists consent_version text;
alter table public.profiles add column if not exists consented_at timestamptz;

alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age is null or age between 13 and 120);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin','super_admin','content_manager')),
  created_at timestamptz not null default now()
);

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date,
  score smallint not null check (score between 1 and 5),
  label text,
  note text,
  source text default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date,
  stress_score smallint check (stress_score between 0 and 10),
  sleep_hours numeric(4,1),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  reason text,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text default 'general',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resource_type text not null check (resource_type in ('video','image','article','exercise')),
  storage_path text,
  thumbnail_path text,
  language text default 'en',
  content_warning text,
  published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_views (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(resource_id, user_id)
);

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.wellness_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'connection',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.wellness_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.wellness_activities(id) on delete cascade,
  assigned_date date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,assigned_date)
);

insert into public.wellness_activities (title, description, category)
select * from (values
  ('Talk to someone for 30 minutes', 'Call or sit with a trusted person and simply share how your day has been.', 'connection'),
  ('Watch something with family', 'Watch a movie, episode, comedy clip, or other light programme together.', 'connection'),
  ('Write about your week', 'Write a few honest lines about what felt difficult, what helped, and what you want next.', 'reflection'),
  ('Take a gentle walk', 'Spend a few minutes walking at a comfortable pace, noticing your surroundings.', 'movement'),
  ('Try a simple workout', 'Do a short, comfortable movement routine. Stop if you feel pain or unwell.', 'movement'),
  ('Listen to calming music', 'Choose music that feels comforting and give yourself a few quiet minutes.', 'music'),
  ('Spend time outdoors', 'Sit near a window, balcony, garden, or another comfortable outdoor space if available.', 'nature'),
  ('Share a meal with someone', 'Have a meal or tea with someone you trust, without making it a formal discussion.', 'connection'),
  ('Do one small act of care', 'Tidy a small space, make your bed, water a plant, or do another manageable task.', 'self-care')
) as v(title, description, category)
where not exists (select 1 from public.wellness_activities a where a.title=v.title);

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
  verified_by uuid references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.professional_contacts add column if not exists verified_by uuid references public.profiles(id);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','super_admin','content_manager'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','super_admin'));
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, gender, preferred_language, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'gender' in ('female','male','other') then new.raw_user_meta_data->>'gender' else null end,
    coalesce(new.raw_user_meta_data->>'preferred_language','en'),
    coalesce(new.raw_user_meta_data->>'timezone','UTC')
  ) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Backfill local dates. Existing profiles without a timezone use project default Asia/Kolkata.
update public.profiles set timezone = 'Asia/Kolkata' where timezone is null or trim(timezone) = '';
update public.mood_entries m set entry_date = ((m.created_at at time zone coalesce(p.timezone,'Asia/Kolkata'))::date) from public.profiles p where p.id=m.user_id and m.entry_date is null;
update public.checkins c set entry_date = ((c.created_at at time zone coalesce(p.timezone,'Asia/Kolkata'))::date) from public.profiles p where p.id=c.user_id and c.entry_date is null;

-- Keep the newest record for a user/day before adding uniqueness.
with ranked as (
  select id, row_number() over (partition by user_id, entry_date order by created_at desc, id desc) rn
  from public.mood_entries where entry_date is not null
) delete from public.mood_entries m using ranked r where m.id=r.id and r.rn>1;
with ranked as (
  select id, row_number() over (partition by user_id, entry_date order by created_at desc, id desc) rn
  from public.checkins where entry_date is not null
) delete from public.checkins c using ranked r where c.id=r.id and r.rn>1;

alter table public.mood_entries alter column entry_date set not null;
alter table public.checkins alter column entry_date set not null;

create unique index if not exists mood_entries_user_entry_date_key on public.mood_entries(user_id, entry_date);
create unique index if not exists checkins_user_entry_date_key on public.checkins(user_id, entry_date);
create index if not exists mood_entries_user_date_idx on public.mood_entries(user_id, entry_date desc);
create index if not exists checkins_user_date_idx on public.checkins(user_id, entry_date desc);
create index if not exists journal_entries_user_created_idx on public.journal_entries(user_id, created_at desc);
create index if not exists alerts_user_status_created_idx on public.alerts(user_id, status, created_at desc);
create index if not exists notifications_user_read_created_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists admin_messages_target_created_idx on public.admin_messages(target_user_id, created_at desc);
do $$ begin if to_regclass('public.wellness_assignments') is not null then execute 'create index if not exists wellness_assignments_user_date_idx on public.wellness_assignments(user_id, assigned_date desc)'; end if; end $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.mood_entries enable row level security;
alter table public.journal_entries enable row level security;
alter table public.checkins enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.resources enable row level security;
alter table public.resource_views enable row level security;
alter table public.admin_messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.professional_contacts enable row level security;
alter table public.wellness_activities enable row level security;
alter table public.wellness_assignments enable row level security;

-- Every policy is dropped first so this file can safely be rerun.
drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read" on public.profiles for select using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "roles own read" on public.user_roles;
create policy "roles own read" on public.user_roles for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "mood own all" on public.mood_entries;
create policy "mood own all" on public.mood_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "journal own all" on public.journal_entries;
create policy "journal own all" on public.journal_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "checkins own all" on public.checkins;
create policy "checkins own all" on public.checkins for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "alerts own read" on public.alerts;
create policy "alerts own read" on public.alerts for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "alerts own insert" on public.alerts;
create policy "alerts own insert" on public.alerts for insert with check (user_id = auth.uid());
drop policy if exists "alerts staff update" on public.alerts;
create policy "alerts staff update" on public.alerts for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications staff insert" on public.notifications;
create policy "notifications staff insert" on public.notifications for insert with check (public.is_staff());

drop policy if exists "resources published read" on public.resources;
create policy "resources published read" on public.resources for select using (published = true or public.is_staff());
drop policy if exists "resources staff write" on public.resources;
create policy "resources staff write" on public.resources for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "resource views own" on public.resource_views;
create policy "resource views own" on public.resource_views for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admin messages recipient read" on public.admin_messages;
create policy "admin messages recipient read" on public.admin_messages for select using (target_user_id = auth.uid() or public.is_staff());
drop policy if exists "admin messages staff insert" on public.admin_messages;
create policy "admin messages staff insert" on public.admin_messages for insert with check (public.is_staff());

drop policy if exists "audit staff read" on public.audit_logs;
create policy "audit staff read" on public.audit_logs for select using (public.is_admin());
drop policy if exists "audit staff insert" on public.audit_logs;
create policy "audit staff insert" on public.audit_logs for insert with check (public.is_staff());

drop policy if exists "wellness activities readable" on public.wellness_activities;
create policy "wellness activities readable" on public.wellness_activities for select to authenticated using (active=true or public.is_staff());
drop policy if exists "wellness assignments own read" on public.wellness_assignments;
create policy "wellness assignments own read" on public.wellness_assignments for select to authenticated using (auth.uid()=user_id or public.is_staff());
drop policy if exists "wellness assignments own insert" on public.wellness_assignments;
create policy "wellness assignments own insert" on public.wellness_assignments for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "wellness assignments own update" on public.wellness_assignments;
create policy "wellness assignments own update" on public.wellness_assignments for update to authenticated using (auth.uid()=user_id or public.is_staff()) with check (auth.uid()=user_id or public.is_staff());

drop policy if exists "professional contacts authenticated read" on public.professional_contacts;
create policy "professional contacts authenticated read" on public.professional_contacts for select using (auth.uid() is not null and is_active = true);
drop policy if exists "professional contacts staff manage" on public.professional_contacts;
create policy "professional contacts staff manage" on public.professional_contacts for all using (public.is_staff()) with check (public.is_staff());

-- Staff receive totals rather than individual mood/check-in health rows.
drop function if exists public.admin_dashboard_counts();
create or replace function public.admin_dashboard_counts()
returns table(users bigint, moods bigint, checkins bigint, alerts bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorized'; end if;
  return query select
    (select count(*) from public.profiles),
    (select count(*) from public.mood_entries),
    (select count(*) from public.checkins),
    (select count(*) from public.alerts where status='open');
end;
$$;
grant execute on function public.admin_dashboard_counts() to authenticated;

-- Realtime is added defensively and does not fail when already present.
do $$ begin alter publication supabase_realtime add table public.mood_entries; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.checkins; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.alerts; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.resources; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.admin_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wellness_assignments; exception when duplicate_object then null; end $$;

comment on table public.journal_entries is 'Private journal entries are intentionally not readable by staff policies.';
comment on column public.wellness_assignments.assigned_date is 'One supportive activity assignment per user per calendar date.';
