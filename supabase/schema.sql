-- MANORAKSHA SIH26094 database foundation
-- Run in Supabase SQL Editor.
-- Review and adapt retention/privacy rules before production use.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  gender text check (gender in ('female','male','other')),
  preferred_language text default 'en',
  timezone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'user'
    check (role in ('user','admin','super_admin','content_manager')),
  created_at timestamptz not null default now()
);

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  stress_score smallint check (stress_score between 0 and 10),
  sleep_hours numeric(4,1),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  severity text not null default 'medium'
    check (severity in ('low','medium','high','critical')),
  reason text,
  status text not null default 'open'
    check (status in ('open','acknowledged','resolved')),
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

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','super_admin','content_manager')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','super_admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, gender)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    case
      when new.raw_user_meta_data->>'gender' in ('female','male','other')
      then new.raw_user_meta_data->>'gender'
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

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

-- Users can access only their own personal records.
create policy "profiles own read" on public.profiles
for select using (id = auth.uid() or public.is_staff());

create policy "profiles own update" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "roles own read" on public.user_roles
for select using (user_id = auth.uid() or public.is_admin());

create policy "mood own all" on public.mood_entries
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "journal own all" on public.journal_entries
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "checkins own all" on public.checkins
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "alerts own read" on public.alerts
for select using (user_id = auth.uid() or public.is_staff());

create policy "alerts own insert" on public.alerts
for insert with check (user_id = auth.uid());

create policy "notifications own read" on public.notifications
for select using (user_id = auth.uid() or public.is_staff());

create policy "notifications own update" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "resources published read" on public.resources
for select using (published = true or public.is_staff());

create policy "resources staff write" on public.resources
for all using (public.is_staff()) with check (public.is_staff());

create policy "resource views own" on public.resource_views
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admin messages recipient read" on public.admin_messages
for select using (target_user_id = auth.uid() or public.is_staff());

create policy "admin messages staff insert" on public.admin_messages
for insert with check (public.is_staff());

create policy "audit staff read" on public.audit_logs
for select using (public.is_admin());

-- Enable Realtime for operational tables if not already included.
alter publication supabase_realtime add table public.mood_entries;
alter publication supabase_realtime add table public.alerts;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.resources;
alter publication supabase_realtime add table public.admin_messages;

-- IMPORTANT:
-- Create the first account through the application.
-- Then promote that account using an authorized SQL session:
--
-- update public.user_roles
-- set role = 'super_admin'
-- where user_id = 'YOUR-AUTH-USER-UUID';
