-- V31: email signup metadata is written to the new profile at creation.
-- Google OAuth does not supply phone by default; app asks the user afterwards.
-- Execute in Supabase SQL Editor BEFORE deploying V31.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, gender, preferred_language, timezone, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'gender' in ('female','male','other') then new.raw_user_meta_data->>'gender' else null end,
    coalesce(new.raw_user_meta_data->>'preferred_language','en'),
    coalesce(new.raw_user_meta_data->>'timezone','UTC'),
    case when new.raw_app_meta_data->>'provider' = 'email'
              and (new.raw_user_meta_data->>'phone') ~ '^\+?[0-9 ()-]{8,18}$'
         then new.raw_user_meta_data->>'phone' else null end
  ) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict (user_id) do nothing;
  return new;
end;
$$;
-- Existing trigger on_auth_user_created already calls public.handle_new_user().
-- Phone number format is checked in UI; verification by SMS is NOT implemented.
