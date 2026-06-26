-- Multiplayer foundation — real campaign membership + a shared, durable roll log.
--
-- Replaces the phase-1 stopgap ("campaign_code groups *my own* characters") with
-- a real membership table (roadmap F2), wires the reserved characters.campaign_id
-- FK, and adds a campaign-scoped `rolls` table streamed over Supabase Realtime.
-- RLS opens from owner-only to campaign-scoped reads so party-mates (and the GM)
-- can see each other. Join/leave run through SECURITY DEFINER RPCs so the read
-- policies on `campaigns` don't have to be loosened and roles can't be forged.

-- ---------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------
create table if not exists campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'gm')),
  character_id uuid references characters(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);
create index if not exists campaign_members_campaign_idx on campaign_members(campaign_id);
create index if not exists campaign_members_user_idx on campaign_members(user_id);

-- Wire the reserved FK now that `campaigns` exists. Stays nullable: characters
-- exist before joining, and legacy code-only groups have no campaign row.
alter table characters drop constraint if exists characters_campaign_id_fkey;
alter table characters
  add constraint characters_campaign_id_fkey
  foreign key (campaign_id) references campaigns(id) on delete set null;
create index if not exists characters_campaign_id_idx on characters(campaign_id);

-- ---------------------------------------------------------------------------
-- "Which campaigns is the caller in?" — SECURITY DEFINER so the RLS policies
-- below can call it without recursing back through campaign_members' own RLS.
-- Includes GM-owned campaigns directly, so a GM is always "in" their campaign.
-- ---------------------------------------------------------------------------
create or replace function public.campaigns_for_user()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select campaign_id from campaign_members where user_id = auth.uid()
  union
  select id from campaigns where gm_id = auth.uid()
$$;

alter table campaign_members enable row level security;

-- Read the membership of any campaign you belong to (player or GM).
drop policy if exists "members read their campaigns" on campaign_members;
create policy "members read their campaigns"
  on campaign_members for select
  using (campaign_id in (select public.campaigns_for_user()));

-- Direct writes are limited to a GM adding themselves to a campaign they own
-- (used on campaign creation). Player join/leave go through the RPCs below.
drop policy if exists "gm inserts own membership" on campaign_members;
create policy "gm inserts own membership"
  on campaign_members for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from campaigns c where c.id = campaign_id and c.gm_id = auth.uid())
  );

drop policy if exists "delete own membership" on campaign_members;
create policy "delete own membership"
  on campaign_members for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Cross-user reads: campaign-mates can read each other's campaign-relevant data.
-- (The original owner-only / gm-only policies stay in place and OR in.)
-- ---------------------------------------------------------------------------

-- Party-mates (and the GM) can read each other's full character sheets. Writes
-- stay owner-only via the existing "owners can do everything" policy.
drop policy if exists "campaign members read characters" on characters;
create policy "campaign members read characters"
  on characters for select
  using (
    campaign_id is not null
    and campaign_id in (select public.campaigns_for_user())
  );

-- Members can read the campaign row (name/code) for display.
drop policy if exists "members read campaign" on campaigns;
create policy "members read campaign"
  on campaigns for select
  using (id in (select public.campaigns_for_user()));

-- ---------------------------------------------------------------------------
-- Shared, durable roll log
-- ---------------------------------------------------------------------------
create table if not exists rolls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  character_id uuid references characters(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists rolls_campaign_created_idx on rolls(campaign_id, created_at);

alter table rolls enable row level security;

drop policy if exists "members read rolls" on rolls;
create policy "members read rolls"
  on rolls for select
  using (campaign_id in (select public.campaigns_for_user()));

drop policy if exists "members insert rolls" on rolls;
create policy "members insert rolls"
  on rolls for insert
  with check (
    actor_id = auth.uid()
    and campaign_id in (select public.campaigns_for_user())
  );
-- Immutable log: no update / delete policies.

-- Stream inserts to subscribed clients.
do $$
begin
  alter publication supabase_realtime add table rolls;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Join / leave by code — atomic, owner-checked, role-safe.
-- ---------------------------------------------------------------------------

-- Joining by code: link the character to the matching campaign and upsert a
-- player membership. A code with no matching campaign still records the
-- campaign_code (legacy code-only grouping) but leaves campaign_id null.
create or replace function public.join_campaign(p_code text, p_character uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_campaign uuid;
begin
  if not exists (select 1 from characters where id = p_character and owner_id = auth.uid()) then
    raise exception 'not your character';
  end if;

  select id into v_campaign from campaigns where code = v_code;

  update characters
    set campaign_code = v_code,
        campaign_id = v_campaign
    where id = p_character;

  if v_campaign is not null then
    insert into campaign_members (campaign_id, user_id, role, character_id)
      values (v_campaign, auth.uid(), 'player', p_character)
      on conflict (campaign_id, user_id)
      do update set character_id = excluded.character_id;
  end if;

  return v_campaign;
end;
$$;

-- Leaving: unlink the character and drop the membership unless another of the
-- caller's characters is still in that campaign (then just repoint it).
create or replace function public.leave_campaign(p_character uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign uuid;
  v_other uuid;
begin
  if not exists (select 1 from characters where id = p_character and owner_id = auth.uid()) then
    raise exception 'not your character';
  end if;

  select campaign_id into v_campaign from characters where id = p_character;

  update characters
    set campaign_code = null, campaign_id = null
    where id = p_character;

  if v_campaign is not null then
    select id into v_other
      from characters
      where owner_id = auth.uid() and campaign_id = v_campaign and id <> p_character
      limit 1;

    if v_other is not null then
      update campaign_members
        set character_id = v_other
        where campaign_id = v_campaign and user_id = auth.uid();
    else
      delete from campaign_members
        where campaign_id = v_campaign and user_id = auth.uid() and role = 'player';
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — RLS scopes *which* rows; these let the roles touch the tables/fns at
-- all (the default Supabase grants did not apply for this project's tables).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.campaign_members to authenticated;
grant all on table public.campaign_members to service_role;
grant select, insert on table public.rolls to authenticated;
grant all on table public.rolls to service_role;

grant execute on function public.campaigns_for_user() to authenticated;
grant execute on function public.join_campaign(text, uuid) to authenticated;
grant execute on function public.leave_campaign(uuid) to authenticated;

-- PostgREST grants EXECUTE to PUBLIC by default, exposing these as /rpc to anon.
-- They no-op for anon (auth.uid() is null), but keep them off the anon surface;
-- authenticated keeps EXECUTE (campaigns_for_user() runs inside the RLS policies).
revoke execute on function public.campaigns_for_user() from public, anon;
revoke execute on function public.join_campaign(text, uuid) from public, anon;
revoke execute on function public.leave_campaign(uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- Backfill existing data into the new model.
-- ---------------------------------------------------------------------------
-- Every existing campaign's owner becomes its GM member.
insert into campaign_members (campaign_id, user_id, role)
  select id, gm_id, 'gm' from campaigns
  on conflict (campaign_id, user_id) do nothing;

-- Link characters whose code matches a real campaign, then add player members.
update characters ch
  set campaign_id = c.id
  from campaigns c
  where ch.campaign_code is not null
    and upper(ch.campaign_code) = c.code
    and ch.campaign_id is null;

insert into campaign_members (campaign_id, user_id, role, character_id)
  select ch.campaign_id, ch.owner_id, 'player', ch.id
  from characters ch
  where ch.campaign_id is not null
  on conflict (campaign_id, user_id) do update set character_id = excluded.character_id;
