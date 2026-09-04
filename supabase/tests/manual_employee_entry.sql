begin;

do $$
declare
  first_selection uuid;
  duplicate_detected boolean := false;
begin
  first_selection := public.submit_gift_selection(
    '__Teej Duplicate Test__',
    'Test Designation',
    'Test Unit',
    'Test Branch',
    'Test Department',
    'Teej Gift Hamper',
    null
  );

  if first_selection is null then
    raise exception 'The first test submission was not created.';
  end if;

  begin
    perform public.submit_gift_selection(
      '  __teej   duplicate TEST__  ',
      'Test Designation',
      'Test Unit',
      'Test Branch',
      'Test Department',
      'Teej Gift Hamper',
      null
    );
  exception
    when sqlstate 'P0001' then
      duplicate_detected := position('Duplicate employee' in sqlerrm) > 0;
  end;

  if not duplicate_detected then
    raise exception 'Normalized duplicate submission was not rejected.';
  end if;
end;
$$;

rollback;
