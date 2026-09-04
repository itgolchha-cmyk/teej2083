insert into public.admin_users (user_id)
values ('7b51ccc2-293d-4cb6-9e79-2bbf2a1554d4')
on conflict (user_id) do nothing;
