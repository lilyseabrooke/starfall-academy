-- The campaign clock (day / time-of-day) was purely local GM React state —
-- reset to the seed default on every reload and never reached players at
-- all. Persist it on the campaign row itself: RLS already covers this
-- exactly right without any new policy or RPC — "gm can do everything"
-- lets the GM write their own campaign, and "members read campaign" already
-- lets every campaign member (GM and players alike) read it.
alter table campaigns
  add column if not exists time_day int not null default 0,
  add column if not exists time_block int not null default 0,
  add column if not exists time_enabled boolean not null default false;
