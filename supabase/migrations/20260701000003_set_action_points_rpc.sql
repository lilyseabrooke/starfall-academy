-- Durable write path for GM-driven Action Points changes (Threat Move,
-- Targeted Threat, Opening, per-player nudges in the Action Scene tab).
-- These previously only mutated a GM-local mirror (GmView.tsx's `action.ap`)
-- that was never persisted or broadcast to the target's own sheet. Mirrors
-- the grant_materials / grant_sheet_field design: GM's browser computes the
-- new value (already clamped to apMax client-side), this RPC re-clamps
-- against the stored actionPointsMax (defense in depth) and authorizes +
-- writes.
create or replace function public.set_action_points(p_character uuid, p_value int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_new int;
begin
  if not public.is_gm_of_character(p_character) then
    raise exception 'not the gm of this campaign';
  end if;

  select coalesce((sheet #>> '{c,actionPointsMax}')::int, 6) into v_max from characters where id = p_character;

  update characters
    set sheet = jsonb_set(
      coalesce(sheet, '{}'::jsonb),
      '{c,actionPoints}',
      to_jsonb(least(greatest(0, p_value), v_max))
    )
    where id = p_character
    returning (sheet #>> '{c,actionPoints}')::int into v_new;

  return v_new;
end;
$$;

grant execute on function public.set_action_points(uuid, int) to authenticated;
revoke execute on function public.set_action_points(uuid, int) from public, anon;
