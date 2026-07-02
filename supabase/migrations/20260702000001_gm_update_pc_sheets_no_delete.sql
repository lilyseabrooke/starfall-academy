-- Re-grant the GM write access to player characters that
-- 20260702000000 removed, but UPDATE only — not DELETE, and not INSERT
-- (players create their own characters via /api/characters).
--
-- The GM is a trusted-but-fallible party: they legitimately need to fix a
-- player's sheet by hand (players often can't find a field themselves and
-- ask the GM to set it), and an arbitrary-rewrite risk from the GM is
-- accepted. What's NOT accepted is the GM being able to delete a player's
-- character outright — that stays owner-only. owner_id itself remains
-- immutable regardless (characters_owner_id_immutable trigger), so a GM
-- write can never transfer ownership either.
create policy "gm updates campaign pc sheets"
  on characters for update
  using (
    type = 'pc'
    and campaign_id in (select id from campaigns where gm_id = auth.uid())
  )
  with check (
    type = 'pc'
    and campaign_id in (select id from campaigns where gm_id = auth.uid())
  );
