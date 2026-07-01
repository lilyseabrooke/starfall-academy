-- Extend grant_sheet_field to cover the specialized GM compendium grant
-- variants (potion sheafs, learned/learning spells), and add a dedicated
-- attune RPC since attuning an artifact durably writes to TWO sheet paths
-- at once (the artifact record itself, plus its derived "Boon" move) —
-- both need to land together rather than as two independent calls.

create or replace function public.grant_sheet_field(p_character uuid, p_field text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section text;
  v_new jsonb;
begin
  v_section := case p_field
    when 'artifacts' then 'inventory'
    when 'recipes' then 'inventory'
    when 'plants' then 'inventory'
    when 'wands' then 'inventory'
    when 'glyphs' then 'inventory'
    when 'items' then 'inventory'
    when 'potions' then 'inventory'
    when 'spells' then 'magic'
    when 'moves' then 'magic'
    else null
  end;

  if v_section is null then
    raise exception 'invalid sheet field: %', p_field;
  end if;

  if not public.is_gm_of_character(p_character) then
    raise exception 'not the gm of this campaign';
  end if;

  update characters
    set sheet = jsonb_set(
      coalesce(sheet, '{}'::jsonb),
      array[v_section, p_field],
      p_value,
      true
    )
    where id = p_character
    returning sheet #> array[v_section, p_field] into v_new;

  return v_new;
end;
$$;

-- Attunes an artifact atomically: writes both inventory.artifacts and the
-- derived magic.moves entry (mirroring useMagicState's addArtMove) in one
-- update, so the two never land out of sync.
create or replace function public.grant_attuned_artifact(p_character uuid, p_artifacts jsonb, p_moves jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb;
begin
  if not public.is_gm_of_character(p_character) then
    raise exception 'not the gm of this campaign';
  end if;

  update characters
    set sheet = jsonb_set(
      jsonb_set(coalesce(sheet, '{}'::jsonb), array['inventory', 'artifacts'], p_artifacts, true),
      array['magic', 'moves'], p_moves, true
    )
    where id = p_character
    returning sheet into v_new;

  return v_new;
end;
$$;

grant execute on function public.grant_attuned_artifact(uuid, jsonb, jsonb) to authenticated;
revoke execute on function public.grant_attuned_artifact(uuid, jsonb, jsonb) from public, anon;
