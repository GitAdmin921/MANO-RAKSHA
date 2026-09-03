-- MANORAKSHA V5: supportive periodic activities
-- Run this in Supabase SQL Editor after the existing MANORAKSHA schema.

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
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.wellness_activities(id) on delete cascade,
  assigned_month date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, assigned_month)
);

alter table public.wellness_activities enable row level security;
alter table public.wellness_assignments enable row level security;

-- Active activity content is readable by signed-in users.
drop policy if exists "wellness activities readable" on public.wellness_activities;
create policy "wellness activities readable"
on public.wellness_activities for select
to authenticated
using (active = true or public.is_staff());

-- Users can only read/create/update their own monthly assignment.
drop policy if exists "wellness assignments own read" on public.wellness_assignments;
create policy "wellness assignments own read"
on public.wellness_assignments for select
to authenticated
using (auth.uid() = user_id or public.is_staff());

drop policy if exists "wellness assignments own insert" on public.wellness_assignments;
create policy "wellness assignments own insert"
on public.wellness_assignments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "wellness assignments own update" on public.wellness_assignments;
create policy "wellness assignments own update"
on public.wellness_assignments for update
to authenticated
using (auth.uid() = user_id or public.is_staff())
with check (auth.uid() = user_id or public.is_staff());

-- Seed gentle, non-clinical activities. ON CONFLICT is intentionally avoided because
-- these are content rows rather than stable IDs; duplicate seeds can be removed by admins.
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
where not exists (
  select 1 from public.wellness_activities a where a.title = v.title
);

-- Optional realtime support for future admin/user activity views.
do $$ begin
  alter publication supabase_realtime add table public.wellness_assignments;
exception when duplicate_object then null; end $$;
