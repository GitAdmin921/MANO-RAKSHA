-- MANORAKSHA Focus Mode private session records
-- Apply this migration in Supabase once. RLS keeps each user limited to their own focus sessions.
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_seconds integer not null check (planned_seconds > 0),
  actual_seconds integer not null default 0 check (actual_seconds >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','exited')),
  created_at timestamptz not null default now()
);

alter table public.focus_sessions enable row level security;

drop policy if exists "focus sessions own select" on public.focus_sessions;
create policy "focus sessions own select" on public.focus_sessions for select to authenticated using (user_id = auth.uid());

drop policy if exists "focus sessions own insert" on public.focus_sessions;
create policy "focus sessions own insert" on public.focus_sessions for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "focus sessions own update" on public.focus_sessions;
create policy "focus sessions own update" on public.focus_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);

do $$ begin
  alter publication supabase_realtime add table public.focus_sessions;
exception when duplicate_object then null; end $$;
