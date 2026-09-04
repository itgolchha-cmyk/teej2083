-- 1. In Supabase Dashboard, open Authentication > Users and create the admin user.
-- 2. Replace the email below with that user's exact email.
-- 3. Run this script once in the Supabase SQL Editor.

do $$
declare
  admin_email text := 'REPLACE_WITH_ADMIN_EMAIL';
  admin_id uuid;
begin
  select id into admin_id
  from auth.users
  where lower(email) = lower(admin_email)
  limit 1;

  if admin_id is null then
    raise exception 'No Supabase Auth user exists for %', admin_email;
  end if;

  insert into public.admin_users (user_id)
  values (admin_id)
  on conflict (user_id) do nothing;
end $$;
