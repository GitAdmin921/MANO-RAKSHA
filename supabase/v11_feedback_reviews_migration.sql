-- MANORAKSHA V11 — Reviews & Feedback
create table if not exists public.feedback_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  category text not null default 'general'
    check (category in ('general','experience','feature','support','bug')),
  message text,
  created_at timestamptz not null default now(),
  constraint feedback_has_content check (rating is not null or nullif(trim(coalesce(message,'')), '') is not null)
);

alter table public.feedback_reviews enable row level security;

drop policy if exists "feedback_select_own" on public.feedback_reviews;
create policy "feedback_select_own" on public.feedback_reviews
for select using (auth.uid() = user_id or public.is_staff());

drop policy if exists "feedback_insert_own" on public.feedback_reviews;
create policy "feedback_insert_own" on public.feedback_reviews
for insert with check (auth.uid() = user_id);

drop policy if exists "feedback_staff_update" on public.feedback_reviews;
create policy "feedback_staff_update" on public.feedback_reviews
for update using (public.is_staff()) with check (public.is_staff());

grant select, insert on public.feedback_reviews to authenticated;
grant update on public.feedback_reviews to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.feedback_reviews;
exception when duplicate_object then null;
end $$;
