-- Deleting a campaign already SET NULLs characters.campaign_id via its FK, but
-- the legacy campaign_code text column (no FK, see 20260624000000) was never
-- cleared alongside it. That left the /characters page falling back to the
-- dead join code instead of showing "no campaign". Clear it in the same
-- transaction as the delete via a BEFORE DELETE trigger, since campaign_id is
-- still populated at that point (the FK's own SET NULL action runs after).
create or replace function public.clear_campaign_code_on_campaign_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update characters
    set campaign_code = null
    where campaign_id = old.id;
  return old;
end;
$$;

drop trigger if exists clear_campaign_code_on_campaign_delete on campaigns;
create trigger clear_campaign_code_on_campaign_delete
  before delete on campaigns
  for each row execute procedure public.clear_campaign_code_on_campaign_delete();

-- One-off backfill: null out campaign_code for characters whose campaign_id
-- has already gone null but whose code still points at a campaign that no
-- longer exists (i.e. they were orphaned by a delete before this trigger).
update characters
  set campaign_code = null
  where campaign_id is null
    and campaign_code is not null
    and not exists (
      select 1 from campaigns where code = upper(characters.campaign_code)
    );
