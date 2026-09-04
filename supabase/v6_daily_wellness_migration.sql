-- MANORAKSHA V6: one new supportive activity every day
-- Run this once in Supabase SQL Editor after V5 wellness migration.
-- The existing assigned_month column is retained for compatibility,
-- but from V6 onward it stores the assignment DATE (YYYY-MM-DD).

-- Convert old V5 monthly assignments to the actual day they were created,
-- so they cannot accidentally reappear on the first day of a future month.
update public.wellness_assignments
set assigned_month = created_at::date
where assigned_month = date_trunc('month', created_at)::date;

comment on column public.wellness_assignments.assigned_month is
  'Assignment date (YYYY-MM-DD). Kept under the legacy column name for V5 compatibility.';

-- The existing unique(user_id, assigned_month) constraint now guarantees
-- one activity per user per day.
