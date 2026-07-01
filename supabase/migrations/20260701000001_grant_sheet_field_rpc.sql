-- Generalize the GM-grant durable write path from materials (a number) to
-- compendium item grants (arrays): factor the GM-authorization check shared
-- by grant_materials into a reusable is_gm_of_character() helper, and add
-- grant_sheet_field for the six inventory array fields. The browser already
-- resolved the compendium entry (compendium data is Sheet-CSV-backed, not
-- DB-backed) and computed the new array via computeCompendiumGrant, so this
-- RPC only authorizes + writes — it does not re-derive the per-category shape.

create or replace function public.is_gm_of_character(p_character uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from characters ch join campaigns cp on cp.id = ch.campaign_id
    where ch.id = p_character and cp.gm_id = auth.uid()
    union
    select 1 from characters ch join campaign_members cm on cm.campaign_id = ch.campaign_id
    where ch.id = p_character and cm.user_id = auth.uid() and cm.role = 'gm'
  );
$$;

grant execute on function public.is_gm_of_character(uuid) to authenticated;
revoke execute on function public.is_gm_of_character(uuid) from public, anon;

-- Re-created with the same external signature/behavior, now delegating its
-- GM check to is_gm_of_character().
create or replace function public.grant_materials(p_character uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new int;
begin
  if not public.is_gm_of_character(p_character) then
    raise exception 'not the gm of this campaign';
  end if;

  update characters
    set sheet = jsonb_set(
      coalesce(sheet, '{}'::jsonb),
      '{c,materials}',
      to_jsonb(greatest(0, coalesce((sheet #>> '{c,materials}')::int, 0) + p_amount))
    )
    where id = p_character
    returning (sheet #>> '{c,materials}')::int into v_new;

  return v_new;
end;
$$;

create or replace function public.grant_sheet_field(p_character uuid, p_field text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb;
begin
  if p_field not in ('artifacts', 'recipes', 'plants', 'wands', 'glyphs', 'items') then
    raise exception 'invalid inventory field: %', p_field;
  end if;

  if not public.is_gm_of_character(p_character) then
    raise exception 'not the gm of this campaign';
  end if;

  update characters
    set sheet = jsonb_set(
      coalesce(sheet, '{}'::jsonb),
      array['inventory', p_field],
      p_value,
      true
    )
    where id = p_character
    returning sheet #> array['inventory', p_field] into v_new;

  return v_new;
end;
$$;

grant execute on function public.grant_sheet_field(uuid, text, jsonb) to authenticated;
revoke execute on function public.grant_sheet_field(uuid, text, jsonb) from public, anon;
