-- Campaigns the user runs as Game Master.
--
-- First slice of the roadmap's "campaigns as a first-class entity" (F2): a
-- campaign is owned by its GM (gm_id). Players still join by code today
-- (characters.campaign_code, the phase-1 stopgap); a campaign's `code` ties that
-- grouping to this row so the GM view can resolve its party once cross-user
-- reads land. The reserved characters.campaign_id FK is populated later.
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  gm_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_gm_id_idx on campaigns(gm_id);

-- Reuse the shared touch_updated_at() trigger fn from the characters migration.
create or replace trigger campaigns_updated_at
  before update on campaigns
  for each row execute procedure touch_updated_at();

alter table campaigns enable row level security;

-- The GM owns their campaigns. (Member read access arrives with multiplayer.)
drop policy if exists "gm can do everything" on campaigns;
create policy "gm can do everything"
  on campaigns for all
  using (gm_id = auth.uid())
  with check (gm_id = auth.uid());

-- Standard data-access grants — RLS scopes which rows; these allow the roles to
-- touch the table at all (see the characters grants migration for why).
grant select, insert, update, delete on table public.campaigns to authenticated;
grant all on table public.campaigns to service_role;
