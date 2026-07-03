-- ALPHA-TESTING SAFETY NET follow-up (see 20260703000000_alpha_sheet_list_backups.sql).
--
-- The original "only back up when non-empty" guard has a hole specific to
-- spells: if a player's spell list gets wiped and they panic and add back
-- one or two spells "to see what happens", that tiny placeholder list is
-- non-empty — so it would immediately overwrite spells_backup, destroying
-- the real recovery snapshot before anyone gets a chance to use it.
--
-- Spells now get an extra guard: the backup can only ever grow (or stay the
-- same length), never shrink. An update with fewer spells than the current
-- spells_backup — including an update with only one or two — is treated the
-- same as an empty one and left alone. moves/bonuses/inventory are
-- unchanged (still "non-empty overwrites").
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

  if public.sf_jsonb_has_entries(v_spells) and jsonb_array_length(v_spells) >= v_prev_spells_len then
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
  'ALPHA SAFETY NET — refreshes the *_backup columns from sheet on every write. moves/bonuses/inventory refresh whenever non-empty; spells additionally never shrinks (guards against a panic re-add of 1-2 spells clobbering a bigger real backup). Not part of the read path. Drop this function and its trigger once spell/move/bonus/inventory wipe bugs are confidently fixed.';
