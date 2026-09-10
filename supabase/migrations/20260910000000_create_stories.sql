-- User-submitted Starfall stories, catalogued as pointers to Google Docs.
--
-- This is the light-weight infrastructure for a not-yet-linked /stories page:
-- it does not store story content, only the doc link, its title, and who
-- wrote it. Rows are meant to be written by the Discord bot (via the
-- service_role key, from a trusted server context) when a member submits a
-- story from the Discord server, and read by anyone with the direct /stories
-- link — no auth required either direction on this table.
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  doc_url text not null,
  -- Discord snowflake of the submitter, kept for moderation/attribution
  -- lookups from the bot side. Not surfaced on the page itself.
  discord_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_created_at_idx on stories(created_at desc);

-- Reuse the shared touch_updated_at() trigger fn (defined in the characters
-- table migration).
create or replace trigger stories_updated_at
  before update on stories
  for each row execute procedure touch_updated_at();

alter table stories enable row level security;

-- The page is public and unauthenticated, so anyone (anon or signed-in) may
-- read the catalogue. Nobody gets insert/update/delete through RLS — those
-- only happen via the service_role key (see the grants below), which bypasses
-- RLS entirely, from the bot's submission endpoint.
drop policy if exists "anyone can read stories" on stories;
create policy "anyone can read stories"
  on stories for select
  using (true);

-- Standard data-access grants — this project does not auto-expose new tables
-- to the Data API roles, so these are required even with RLS enabled (see the
-- characters grants migration for the fuller explanation). Only select is
-- granted to anon/authenticated; writes are service_role-only.
grant select on table public.stories to anon, authenticated;
grant all on table public.stories to service_role;
