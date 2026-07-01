-- Grant the GM full RLS permissions over every character in their own
-- campaign (select/insert/update/delete), per plan. owner_id must stay
-- untouchable regardless of who performs the update — a BEFORE UPDATE
-- trigger enforces this unconditionally (not just for the new GM policy;
-- it was never a legitimate operation for anyone, including the owner
-- themselves — nothing in the app currently updates owner_id, it's only
-- ever set at insert). campaign_id is intentionally left mutable: the
-- existing join_campaign/leave_campaign RPCs legitimately change it.

create or replace function public.prevent_owner_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists characters_owner_id_immutable on characters;
create trigger characters_owner_id_immutable
  before update on characters
  for each row execute procedure prevent_owner_id_change();

-- GM: full CRUD on any character (pc or npc) in a campaign they run.
-- (Read access for ANY campaign member, GM included, already exists via
-- "campaign members read characters" — this adds insert/update/delete,
-- scoped to campaigns the caller actually GMs, not just belongs to.)
drop policy if exists "gm manages campaign characters" on characters;
create policy "gm manages campaign characters"
  on characters for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
