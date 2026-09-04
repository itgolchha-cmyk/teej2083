begin;

create extension if not exists pgcrypto;

create table if not exists public.staff (
  id bigint generated always as identity primary key,
  employee_name text not null unique,
  designation text not null,
  unit text not null,
  branch text not null,
  department text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_selections (
  id uuid primary key default gen_random_uuid(),
  staff_id bigint not null unique references public.staff(id) on delete restrict,
  gift_name text not null check (gift_name in ('Teej Gift Hamper', 'Tranquility Spa')),
  spa_treatment text,
  submitted_at timestamptz not null default now(),
  constraint valid_spa_treatment check (
    (gift_name = 'Teej Gift Hamper' and spa_treatment is null)
    or
    (gift_name = 'Tranquility Spa' and spa_treatment is not null and spa_treatment in (
      'Bukuwa — 30 min',
      'Charan Abhyanga Massage — 30 min',
      'Head and Shoulder Massage — 30 min',
      'Face Deep Cleansing — 40 min'
    ))
  )
);

create index if not exists gift_selections_submitted_at_idx
  on public.gift_selections (submitted_at desc);

alter table public.staff enable row level security;
alter table public.admin_users enable row level security;
alter table public.gift_selections enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Public can read active staff" on public.staff;
create policy "Public can read active staff"
on public.staff for select
to anon, authenticated
using (active = true);

drop policy if exists "Admins can read selections" on public.gift_selections;
create policy "Admins can read selections"
on public.gift_selections for select
to authenticated
using (public.is_admin());

revoke all on public.admin_users from anon, authenticated;
revoke insert, update, delete on public.staff from anon, authenticated;
grant select on public.staff to anon, authenticated;
revoke all on public.gift_selections from anon;
revoke insert, update, delete on public.gift_selections from authenticated;
grant select on public.gift_selections to authenticated;

create or replace function public.submit_gift_selection(
  p_staff_id bigint,
  p_gift_name text,
  p_spa_treatment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selection_id uuid;
begin
  if not exists (select 1 from public.staff where id = p_staff_id and active = true) then
    raise exception 'Employee is not available for selection.' using errcode = 'P0001';
  end if;

  if p_gift_name not in ('Teej Gift Hamper', 'Tranquility Spa') then
    raise exception 'Invalid gift selection.' using errcode = 'P0001';
  end if;

  if p_gift_name = 'Teej Gift Hamper' and p_spa_treatment is not null then
    raise exception 'A spa treatment cannot be selected with the gift hamper.' using errcode = 'P0001';
  end if;

  if p_gift_name = 'Tranquility Spa' and (
    p_spa_treatment is null or p_spa_treatment not in (
      'Bukuwa — 30 min',
      'Charan Abhyanga Massage — 30 min',
      'Head and Shoulder Massage — 30 min',
      'Face Deep Cleansing — 40 min'
    )
  ) then
    raise exception 'Please select one valid spa treatment.' using errcode = 'P0001';
  end if;

  insert into public.gift_selections (staff_id, gift_name, spa_treatment)
  values (p_staff_id, p_gift_name, p_spa_treatment)
  returning id into selection_id;

  return selection_id;
exception
  when unique_violation then
    raise exception 'A gift selection has already been submitted for this employee.' using errcode = 'P0001';
end;
$$;

revoke all on function public.submit_gift_selection(bigint, text, text) from public;
grant execute on function public.submit_gift_selection(bigint, text, text) to anon, authenticated;

insert into public.staff (employee_name, designation, unit, branch, department) values
  ('Anju Singh','Junior Officer','Bajaj Bikes','Bajaj Showroom','Sales'),
  ('Kabita Podel','Office Assistant','Bajaj Bikes','Bajaj Showroom','Sales'),
  ('Sujata Adhikari','Senior Officer-Sales','Bajaj Bikes','Bajaj Showroom','Sales'),
  ('Goma Gajurel','Store Assistant','Chetak EV','Chetak Service','Spares'),
  ('Shristi Maharjan','Senior Officer-Customer Care','Chetak EV','Chetak Service','Service'),
  ('Ambika Deula','Office Assistant','Chetak EV','Chetak Showroom','Sales'),
  ('Anisha Maharjan','Senior Officer-Sales','Chetak EV','Chetak Showroom','Sales'),
  ('Anita Karki','Officer-Accounts','Chetak EV','Chetak Showroom','Account & Finance'),
  ('Sumitra Dhakal','Officer-Sales','Chetak EV','Chetak Showroom','Sales'),
  ('Subita Mushyan','Deputy Manager','Bajaj Bikes','Corporate Office','Account & Finance'),
  ('Richa Amatya','Assistant Manager','Bajaj Bikes','Corporate Office','Account & Finance'),
  ('Sudha Acharya','Cashier','Bajaj Bikes','Corporate Office','Account & Finance'),
  ('Karuna Khatri','Junior Assistant Manager','Bajaj Bikes','Corporate Office','Logistics'),
  ('Siwani Puri','Executive Secretary','Bajaj Bikes','Corporate Office','Admin'),
  ('Anjana Maharjan','Junior Assistant Manager','Servo','Corporate Office','Account & Finance'),
  ('Rukshana Maharjan','Junior Assistant Manager','Servo','Corporate Office','Marketing'),
  ('Alina KC','Officer','Servo','Corporate Office','Sales'),
  ('Relena Maharjan','Incharge-Customer Care','Bajaj Bikes','Corporate Office','Service'),
  ('Namita Koirala','Senior Officer','Bajaj Bikes','Corporate Office','Account & Finance'),
  ('Ranjeeta Phuyal','Senior Officer','Bajaj Bikes','Corporate Office','HR'),
  ('Monika Ghimire','Senior Front Desk Officer','Bajaj Bikes','Corporate Office','Admin'),
  ('Shreeti Maharjan','Senior Officer','Bajaj Bikes','Corporate Office','Sales'),
  ('Shreya Giri','Director','Bajaj Bikes','Corporate Office','Management'),
  ('Rashmi Pandey','Manager','Bajaj Bikes','Corporate Office','Service'),
  ('Simran Lama','Customer Service Representative','Bajaj Bikes','Corporate Office','Service'),
  ('Nishma Ruwale Magar','Customer Service Representative','Bajaj Bikes','Corporate Office','Service'),
  ('Rupa Bista','Office Assistant','Bajaj Bikes','Corporate Office','Admin'),
  ('Shophiya Dongol Deula','Front Desk Officer','Bajaj Bikes','Corporate Office','Admin'),
  ('Ritu Chauhan','Head Of HR','Bajaj Bikes','Corporate Office','HR'),
  ('Nisha Bhattarai','Officer-Accounts','Bajaj Bikes','Corporate Office','Account & Finance'),
  ('Pupsa Bogati','Customer Service Representative','Bajaj Bikes','Corporate Office','Service'),
  ('Chanda Rokamagar','Office Assistant','Bajaj Bikes','Corporate Office','Admin'),
  ('Asha Kafle','Customer Service Representative','Bajaj Bikes','Corporate Office','Service'),
  ('Manju Khatiwada','Assistant Manager','KTM Bikes','KTM Service-Sanogaucharan','Spares'),
  ('Neha Adhikari','Senior Officer-Customer Care','KTM Bikes','KTM Service-Sanogaucharan','Service'),
  ('Rita Dhimal','Office Assistant','KTM Bikes','KTM Service-Sanogaucharan','Service'),
  ('Bandana Lamichhane Khatri','Senior Officer','KTM Bikes','KTM Service-Sanogaucharan','Service'),
  ('Jharana Shrestha','Receptionist','KTM Bikes','KTM Service-Sanogaucharan','Service'),
  ('Sujata Khadka','Officer-Customer Care','KTM Bikes','KTM Service-Sanogaucharan','Service'),
  ('Reena Maharjan','Senior Assistant','KTM Bikes','KTM Showroom-Naxal','Service'),
  ('Phulmaya Gurung','Office Assistant','Bajaj Bikes','Kuleshwor','Sales'),
  ('Sulochana Bhattarai','Senior Officer-Logistics','Bajaj Bikes','Kuleshwor','Spares'),
  ('Binita Khiju','Customer Care Officer','Triumph Bikes','Triumph Service','Spares'),
  ('Sarana Maharjan','Sr. Officer-Accounts & Finance','Triumph Bikes','Triumph Showroom','Service'),
  ('Garima Limbu','Receptionist','Triumph Bikes','Triumph Showroom','Account & Finance'),
  ('Arju Dhital','Accounts Assistant','Triumph Bikes','Triumph Showroom','Sales'),
  ('Mathura Bhandari','Cleaner','Sitapaila','Sitapaila','Account & Finance'),
  ('Shodha Bagale Thapa','House Keeper','Sitapaila','Sitapaila','Sitapaila'),
  ('Nita Khadka','Gardener','Sitapaila','Sitapaila','Sitapaila'),
  ('Nirmala Thapa','Gardener','Sitapaila','Sitapaila','Sitapaila'),
  ('Sita Khadka','Gardener','Sitapaila','Sitapaila','Sitapaila'),
  ('Sahili Tiwari','Helper','Sitapaila','Sitapaila','Sitapaila'),
  ('Bami Maya Magar','House Keeper','Sitapaila','Sitapaila','Sitapaila'),
  ('Pramila Subedi','Cleaner','Sitapaila','Sitapaila','Sitapaila'),
  ('Tulki Kandel','Officer','Bajaj Bikes','Narayanghat','Spares'),
  ('Sadiksha Bhattarai','Officer-Sales','Bajaj Bikes','Narayanghat','Spares'),
  ('Sarita Chaudhary','Office Assistant','Triumph Bikes','Narayanghat','Sales'),
  ('Parbati Sen','Office Assistant','Bajaj Bikes','Bhumahi Branch','Spares'),
  ('Muskan Gyawali','Office Assistant','Bajaj Bikes','Bhumahi Branch','Spares'),
  ('Sabitri Dhakal','Office Assistant','Bajaj Bikes','Bhumahi Branch','Logistics'),
  ('Aasha Bhandari','CRM','Daily Wages & Intern','Corporate Office','Not specified'),
  ('Merina Bhandari','CRM','Daily Wages & Intern','Corporate Office','Not specified'),
  ('Manila Rai','Sweeper','Daily Wages & Intern','Itahari','Not specified'),
  ('Bina Dangi','Registration Assistant','Daily Wages & Intern','Not specified','Not specified'),
  ('Divya Shrestha','Registration Assistant','Daily Wages & Intern','Not specified','Not specified'),
  ('Prinja Dhungana','Intern','Daily Wages & Intern','Naxal','Not specified'),
  ('Sandhya Kafle','Intern','Daily Wages & Intern','Naxal','Not specified'),
  ('Manju Devi Chaudhary Ray','Office Helper','Daily Wages & Intern','Bhumahi Spare','Not specified')
on conflict (employee_name) do update set
  designation = excluded.designation,
  unit = excluded.unit,
  branch = excluded.branch,
  department = excluded.department,
  active = true;

commit;
