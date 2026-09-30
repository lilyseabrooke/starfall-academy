-- Full NPC character sheets: characters rows with type = 'npc', owned by the
-- GM who created them and attached to the campaign via campaign_id.
--
-- The GM already has for-all access to NPC rows in their own campaigns
-- ("gm manages campaign npcs", 20260808153446). What's left is keeping them
-- hidden from everyone else: "campaign members read characters" grants any
-- campaign member (players included) a SELECT on every character in the
-- campaign, which would now expose NPC sheets. Narrow it to player
-- characters; the GM reads NPCs through their own policy above (and still
-- reads PCs through this one, via campaigns_for_user()).
drop policy if exists "campaign members read characters" on characters;
create policy "campaign members read characters"
  on characters for select
  using (
    type = 'pc'
    and campaign_id is not null
    and campaign_id in (select public.campaigns_for_user())
  );
