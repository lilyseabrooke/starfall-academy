-- GM materials grants — the GM dashboard only mutated its own local React
-- state (GmView.tsx `addMaterials`), so grants vanished on reload and never
-- reached a player who wasn't live on their sheet at that moment. This RPC
-- gives the GM a real, durable write path: a SECURITY DEFINER function that
-- checks the caller is the target character's GM, then atomically bumps
-- characters.sheet -> c -> materials (clamped at 0, like the client-side
-- adjustMaterials). The existing realtime "grant" broadcast still fires
-- separately for the instant live-toast/update when the player is online;
-- this RPC is what makes the change survive a reload either side.
create or replace function public.grant_materials(p_character uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign uuid;
  v_new int;
begin
  select campaign_id into v_campaign from characters where id = p_character;
  if v_campaign is null then
    raise exception 'character is not in a campaign';
  end if;

  if not exists (
    select 1 from campaigns where id = v_campaign and gm_id = auth.uid()
    union
    select 1 from campaign_members where campaign_id = v_campaign and user_id = auth.uid() and role = 'gm'
  ) then
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

grant execute on function public.grant_materials(uuid, int) to authenticated;
revoke execute on function public.grant_materials(uuid, int) from public, anon;
