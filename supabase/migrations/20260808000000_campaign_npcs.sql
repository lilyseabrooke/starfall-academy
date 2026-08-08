-- NPCs on the GM board were purely local React state — reset to the seed
-- cast on every reload, with nothing saved for a campaign. Persist them on
-- the campaign row itself, the same pattern as time_day/time_block/
-- time_enabled: RLS already covers this exactly right without any new
-- policy or RPC — "gm can do everything" lets the GM read/write their own
-- campaign, and only the GM ever reads or writes the NPC cast.
alter table campaigns
  add column if not exists npcs jsonb not null default '[]'::jsonb;
