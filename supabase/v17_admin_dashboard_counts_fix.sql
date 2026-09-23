-- MANORAKSHA: Admin dashboard live totals fix
-- Run this once in Supabase SQL Editor.
-- This exposes aggregate totals to staff without exposing individual mood/check-in rows.

create or replace function public.admin_dashboard_counts()
returns table(users bigint, moods bigint, checkins bigint, alerts bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.mood_entries),
    (select count(*) from public.checkins),
    (select count(*) from public.alerts where status = 'open');
end;
$$;

grant execute on function public.admin_dashboard_counts() to authenticated;
