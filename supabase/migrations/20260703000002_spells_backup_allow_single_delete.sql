-- ALPHA-TESTING SAFETY NET follow-up (see 20260703000000/20260703000001).
--
-- The previous "backup can only grow" rule was too strict: there's no UI to
-- delete more than one spell at a time, so a player legitimately dropping
-- one spell shrinks their real spell list by 1 — and that should still
-- refresh spells_backup. Two rapid single-deletions racing through the
-- debounced autosave could plausibly land as a single write that's short by
-- 2, so that's allowed too. A write short by 3 or more can't come from any
-- legitimate action in the app, so it's still treated like an empty write
-- and never overwrites spells_backup.
create or replace function public.backup_sheet_lists()
returns trigger
language plpgsql
as $$
declare
  v_spells jsonb := new.sheet #> '{magic,spells}';
  v_moves jsonb := new.sheet #> '{magic,moves}';
  v_bonuses jsonb := new.sheet #> '{magic,bonuses}';
  v_inventory jsonb := new.sheet -> 'inventory';
  v_prev_spells_len integer := 0;
begin
  if tg_op = 'UPDATE' and old.spells_backup is not null then
    v_prev_spells_len := jsonb_array_length(old.spells_backup);
  end if;

  if public.sf_jsonb_has_entries(v_spells) and jsonb_array_length(v_spells) >= v_prev_spells_len - 2 then
    new.spells_backup := v_spells;
    new.spells_backup_at := now();
  end if;

  if public.sf_jsonb_has_entries(v_moves) then
    new.moves_backup := v_moves;
    new.moves_backup_at := now();
  end if;
  if public.sf_jsonb_has_entries(v_bonuses) then
    new.bonuses_backup := v_bonuses;
    new.bonuses_backup_at := now();
  end if;
  if public.sf_jsonb_has_entries(v_inventory) then
    new.inventory_backup := v_inventory;
    new.inventory_backup_at := now();
  end if;
  return new;
end;
$$;

comment on function public.backup_sheet_lists() is
  'ALPHA SAFETY NET — refreshes the *_backup columns from sheet on every write. moves/bonuses/inventory refresh whenever non-empty; spells additionally rejects any write short by 3+ spells versus the current backup (there is no multi-delete UI, so that can only be a wipe), while still allowing legitimate single/double spell deletions through. Not part of the read path. Drop this function and its trigger once spell/move/bonus/inventory wipe bugs are confidently fixed.';
