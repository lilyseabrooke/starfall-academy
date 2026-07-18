-- Lightweight autosave telemetry: the bandwidth incidents (party-wide
-- over-fetch, full-sheet PATCHes, and a conflict-retry livelock) were only
-- diagnosable by hand-sampling raw Vercel runtime logs after the fact —
-- there was no durable, queryable record of what the autosave path was
-- actually doing during a session. This table gives one: every save attempt
-- logs a row (saved / conflict / gave_up), written directly from the
-- browser (fire-and-forget, doesn't block or fail the save itself), so a
-- post-session query answers "how many saves, how many conflicts, did
-- anything hit the retry cap, on which characters, how big were the
-- patches" without digging through logs.
create table character_save_events (
  id bigint generated always as identity primary key,
  character_id uuid not null references characters(id) on delete cascade,
  event text not null check (event in ('saved', 'conflict', 'gave_up')),
  patch_bytes int,
  conflict_streak int,
  created_at timestamptz not null default now()
);

create index on character_save_events(character_id, created_at);
create index on character_save_events(created_at);

alter table character_save_events enable row level security;

-- Same visibility as a write to the character itself: owner, or GM of the
-- campaign it's in. The exists() subquery re-evaluates under the
-- characters table's own RLS, so it naturally matches "owners can do
-- everything" / "gm updates campaign pc sheets" without duplicating them.
create policy "character owners and gms log and read save events"
  on character_save_events for all
  using (exists (select 1 from characters where id = character_id))
  with check (exists (select 1 from characters where id = character_id));
