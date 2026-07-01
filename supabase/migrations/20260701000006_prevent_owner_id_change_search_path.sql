-- Security advisor flagged prevent_owner_id_change() (added last migration)
-- for a mutable search_path, unlike every other function in this schema.
-- Pin it, matching the existing convention.
create or replace function public.prevent_owner_id_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed';
  end if;
  return new;
end;
$$;
