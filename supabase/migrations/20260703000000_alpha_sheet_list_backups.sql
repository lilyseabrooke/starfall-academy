-- ALPHA-TESTING SAFETY NET — not a permanent part of the schema.
--
-- We've had more than one bug (respec commit, stale-autosave races) silently
-- blank out a character's spells/moves/bonuses/inventory by overwriting the
-- `sheet` column wholesale. While we're still hunting for the rest of those
-- bugs, each of the four list-shaped sections gets a shadow "last known
-- non-empty" column, kept current by a trigger that fires on every write —
-- so there's no polling/staleness window like a periodic cron backup would
-- have. If a list gets wiped again, the previous value can be restored by
-- hand from the Supabase dashboard, e.g.:
--
--   update characters
--     set sheet = jsonb_set(sheet, '{magic,spells}', spells_backup)
--     where id = '<character id>';
--
-- These columns are intentionally *not* read by the application — they're a
-- manual recovery aid for the troubleshooting period, not a feature. Once
-- the underlying wipe bugs are confidently fixed and this hasn't fired in
-- practice for a while, drop backup_sheet_lists(), its trigger, and these
-- four *_backup / *_backup_at column pairs.

alter table characters
  add column spells_backup jsonb,
  add column spells_backup_at timestamptz,
  add column moves_backup jsonb,
  add column moves_backup_at timestamptz,
  add column bonuses_backup jsonb,
  add column bonuses_backup_at timestamptz,
  add column inventory_backup jsonb,
  add column inventory_backup_at timestamptz;

comment on column characters.spells_backup is
  'ALPHA SAFETY NET — last known non-empty sheet.magic.spells, kept current by the backup_sheet_lists trigger. Not read by the app; manual recovery only. Drop once spell-wipe bugs are confidently fixed.';
comment on column characters.spells_backup_at is
  'ALPHA SAFETY NET — when spells_backup was last refreshed. Drop alongside spells_backup.';
comment on column characters.moves_backup is
  'ALPHA SAFETY NET — last known non-empty sheet.magic.moves, kept current by the backup_sheet_lists trigger. Not read by the app; manual recovery only. Drop once wipe bugs are confidently fixed.';
comment on column characters.moves_backup_at is
  'ALPHA SAFETY NET — when moves_backup was last refreshed. Drop alongside moves_backup.';
comment on column characters.bonuses_backup is
  'ALPHA SAFETY NET — last known non-empty sheet.magic.bonuses, kept current by the backup_sheet_lists trigger. Not read by the app; manual recovery only. Drop once wipe bugs are confidently fixed.';
comment on column characters.bonuses_backup_at is
  'ALPHA SAFETY NET — when bonuses_backup was last refreshed. Drop alongside bonuses_backup.';
comment on column characters.inventory_backup is
  'ALPHA SAFETY NET — last known non-empty sheet.inventory (artifacts/potions/recipes/plants/wands/glyphs/items/runeStack together), kept current by the backup_sheet_lists trigger. Not read by the app; manual recovery only. Drop once wipe bugs are confidently fixed.';
comment on column characters.inventory_backup_at is
  'ALPHA SAFETY NET — when inventory_backup was last refreshed. Drop alongside inventory_backup.';

-- True for a jsonb array with at least one element, or a jsonb object with
-- at least one array-valued key that itself has an element (covers
-- sheet.inventory, which is an object of arrays). Anything else (null,
-- '{}', an object of only-empty arrays) counts as empty and is never backed
-- up over a previous good snapshot.
create or replace function public.sf_jsonb_has_entries(v jsonb)
returns boolean
language sql
immutable
as $$
  select case jsonb_typeof(v)
    when 'array' then jsonb_array_length(v) > 0
    when 'object' then exists (
      select 1 from jsonb_each(v) e
      where jsonb_typeof(e.value) = 'array' and jsonb_array_length(e.value) > 0
    )
    else false
  end;
$$;

comment on function public.sf_jsonb_has_entries(jsonb) is
  'ALPHA SAFETY NET helper for backup_sheet_lists(). Drop alongside the *_backup columns.';

create or replace function public.backup_sheet_lists()
returns trigger
language plpgsql
as $$
declare
  v_spells jsonb := new.sheet #> '{magic,spells}';
  v_moves jsonb := new.sheet #> '{magic,moves}';
  v_bonuses jsonb := new.sheet #> '{magic,bonuses}';
  v_inventory jsonb := new.sheet -> 'inventory';
begin
  if public.sf_jsonb_has_entries(v_spells) then
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
  'ALPHA SAFETY NET — refreshes the *_backup columns from sheet on every write, whenever the new value is non-empty. Not part of the read path. Drop this function and its trigger once spell/move/bonus/inventory wipe bugs are confidently fixed.';

create trigger characters_backup_sheet_lists
  before insert or update on characters
  for each row execute procedure public.backup_sheet_lists();
