begin;

create unique index if not exists staff_employee_name_normalized_uidx
  on public.staff ((lower(regexp_replace(btrim(employee_name), '\s+', ' ', 'g'))));

create or replace function public.submit_gift_selection(
  p_employee_name text,
  p_designation text,
  p_unit text,
  p_branch text,
  p_department text,
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
  employee_id bigint;
  employee_is_active boolean;
  clean_name text := regexp_replace(btrim(coalesce(p_employee_name, '')), '\s+', ' ', 'g');
  clean_designation text := regexp_replace(btrim(coalesce(p_designation, '')), '\s+', ' ', 'g');
  clean_unit text := regexp_replace(btrim(coalesce(p_unit, '')), '\s+', ' ', 'g');
  clean_branch text := regexp_replace(btrim(coalesce(p_branch, '')), '\s+', ' ', 'g');
  clean_department text := regexp_replace(btrim(coalesce(p_department, '')), '\s+', ' ', 'g');
begin
  if char_length(clean_name) < 2 or char_length(clean_name) > 150 then
    raise exception 'Please enter a valid employee name.' using errcode = 'P0001';
  end if;

  if clean_designation = '' or clean_unit = '' or clean_branch = '' or clean_department = '' then
    raise exception 'Please complete all employee details.' using errcode = 'P0001';
  end if;

  if greatest(
    char_length(clean_designation),
    char_length(clean_unit),
    char_length(clean_branch),
    char_length(clean_department)
  ) > 150 then
    raise exception 'One or more employee details are too long.' using errcode = 'P0001';
  end if;

  if p_gift_name not in ('Teej Gift Hamper', 'Tranquility Spa') then
    raise exception 'Invalid gift selection.' using errcode = 'P0001';
  end if;

  if p_gift_name = 'Teej Gift Hamper' and p_spa_treatment is not null then
    raise exception 'A spa treatment cannot be selected with the gift hamper.' using errcode = 'P0001';
  end if;

  if p_gift_name = 'Tranquility Spa' and p_spa_treatment is null then
    raise exception 'Please select one valid spa treatment.' using errcode = 'P0001';
  end if;

  select id, active
    into employee_id, employee_is_active
  from public.staff
  where lower(regexp_replace(btrim(employee_name), '\s+', ' ', 'g')) = lower(clean_name)
  limit 1;

  if employee_id is not null and not employee_is_active then
    raise exception 'This employee record is not active.' using errcode = 'P0001';
  end if;

  if employee_id is null then
    insert into public.staff (employee_name, designation, unit, branch, department)
    values (clean_name, clean_designation, clean_unit, clean_branch, clean_department)
    returning id into employee_id;
  end if;

  insert into public.gift_selections (staff_id, gift_name, spa_treatment)
  values (employee_id, p_gift_name, p_spa_treatment)
  returning id into selection_id;

  return selection_id;
exception
  when unique_violation then
    raise exception 'Duplicate employee: a gift selection has already been submitted for this employee name.' using errcode = 'P0001';
end;
$$;

revoke all on function public.submit_gift_selection(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_gift_selection(text, text, text, text, text, text, text) to anon, authenticated;

commit;
