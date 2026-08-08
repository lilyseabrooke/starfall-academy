-- The GM's campaign journal (Notes tab) was purely local React state, same
-- issue campaigns.npcs just fixed — reset to nothing on every reload with
-- nothing saved for a campaign. Persist it the same way: RLS already lets
-- the GM read/write their own campaign row, and only the GM ever reads or
-- writes their journal.
alter table campaigns
  add column if not exists notes jsonb not null default '[]'::jsonb;
