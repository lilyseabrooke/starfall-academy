-- "gm manages campaign characters" (20260701000005) granted the GM for-all
-- (select/insert/update/delete) access to EVERY character in a campaign they
-- run, including player-owned PCs — so a GM could delete or overwrite a
-- player's character directly (e.g. via DELETE /api/characters/[id], which
-- only checks RLS). That was never the intent: every legitimate GM write to a
-- player's sheet already goes through its own GM-checked SECURITY DEFINER RPC
-- (grant_materials, grant_sheet_field, grant_attuned_artifact,
-- set_action_points), none of which need this table-level policy. NPCs are
-- currently pure client-side state in GmView (never persisted to this table),
-- so scoping the policy to type='npc' removes the PC blast radius today while
-- leaving room for persisted NPCs later. Read access for PCs is unaffected —
-- "campaign members read characters" already covers the GM reading their party.
drop policy if exists "gm manages campaign characters" on characters;
create policy "gm manages campaign npcs"
  on characters for all
  using (
    type = 'npc'
    and campaign_id in (select id from campaigns where gm_id = auth.uid())
  )
  with check (
    type = 'npc'
    and campaign_id in (select id from campaigns where gm_id = auth.uid())
  );
