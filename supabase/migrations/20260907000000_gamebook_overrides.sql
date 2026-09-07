-- Temporary live-edit utility for the gamebook (/gamebook/edit): lets book
-- text be tweaked from the deployed site and show up immediately, without a
-- redeploy. content/*.md stays the source of truth for the shipped copy;
-- a row here shadows one part's text at render time. Anyone can read (the
-- live pages need to render it for every visitor); only the site owner can
-- write. Drop this table once the utility is retired and any keeper edits
-- have been folded back into content/*.md.
create table gamebook_overrides (
  slug text primary key,
  text text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table gamebook_overrides enable row level security;

create policy "anyone can read gamebook overrides"
  on gamebook_overrides for select
  using (true);

create policy "site owner can write gamebook overrides"
  on gamebook_overrides for all
  using (auth.jwt() ->> 'email' = 'lilyseabrooke00@gmail.com')
  with check (auth.jwt() ->> 'email' = 'lilyseabrooke00@gmail.com');
