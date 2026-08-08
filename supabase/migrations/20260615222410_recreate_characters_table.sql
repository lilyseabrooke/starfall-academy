-- RECONCILIATION FILE — this statement was already applied to the remote
-- project (as "recreate_characters_table") and is not being re-run; it's
-- added here so the migration history in this repo matches what actually
-- happened on the database.
--
-- 20260615000000_create_characters_table.sql originally shipped the wide
-- Roll20-column schema described in its own commit message. Commit 3c67461
-- ("Simplify characters table to sheet JSONB design") rewrote that file's
-- contents in place rather than adding a new migration — fine for a repo
-- with nothing deployed yet, except the wide-column table had *already*
-- been applied to the remote project. The live schema change was made
-- directly against the database as its own migration (drop the empty
-- wide-column table, recreate with the JSONB design) and never got written
-- back as a file here — until now.
drop table if exists characters cascade;

create table characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid,
  type text not null default 'pc' check (type in ('pc', 'npc')),
  name text not null,
  sheet jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on characters(owner_id);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger characters_updated_at
  before update on characters
  for each row execute procedure touch_updated_at();

alter table characters enable row level security;

create policy "owners can do everything"
  on characters for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
