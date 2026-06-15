-- The characters table
create table characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid, -- nullable; characters exist before joining a campaign
  type text not null default 'pc' check (type in ('pc', 'npc')),
  name text not null,
  sheet jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for the dashboard query ("my characters")
create index on characters(owner_id);

-- Auto-update updated_at on any write
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger characters_updated_at
  before update on characters
  for each row execute procedure touch_updated_at();

-- RLS
alter table characters enable row level security;

create policy "owners can do everything"
  on characters for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
