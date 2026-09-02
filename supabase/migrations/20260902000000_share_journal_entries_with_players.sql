-- Sharing journal pages with the players (character sheet → Journal tab).
--
-- The GM's journal lives in campaigns.notes, and a page now carries a
-- `shared` flag the GM toggles in the Notes tab. Players must see the shared
-- pages — and *only* those — so this migration does two things:
--
--   1. Takes the notes column off the campaign row's readable surface. The
--      "members read campaign" policy (multiplayer migration) lets every
--      player select the campaign row, and RLS is row-level: it cannot hide a
--      column. A player could therefore read the GM's whole journal, prep and
--      secrets included, straight from the client. Column-level grants are the
--      only lever, and they apply per role — the GM is `authenticated` too —
--      so notes come off the grant list for everyone and both sides read it
--      back through a definer function that knows who is asking.
--   2. Adds those two functions: the GM's full journal, and the players'
--      shared subset.
--
-- NOTE: because the table-level SELECT grant is replaced by a column list, a
-- future column on `campaigns` is invisible to clients until it is added to
-- the grant below. That's deliberate — new columns start private.

revoke select on table public.campaigns from authenticated;
grant select (id, gm_id, name, code, created_at, updated_at,
              time_day, time_block, time_enabled, npcs)
  on table public.campaigns to authenticated;
-- INSERT / UPDATE / DELETE grants are untouched: the GM still writes the
-- journal with a plain `update campaigns set notes = ...`, scoped by the
-- existing "gm can do everything" policy.

-- The GM's own journal, in full.
create or replace function public.gm_campaign_notes(p_campaign uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
           (select c.notes from campaigns c
             where c.id = p_campaign and c.gm_id = auth.uid()),
           '[]'::jsonb
         )
$$;

-- The pages the GM marked shared, for any member of the campaign. Fields are
-- whitelisted rather than passed through, so a future GM-only field on a note
-- (say, a private annotation) does not ride along into the players' copy.
create or replace function public.shared_campaign_notes(p_campaign uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', n->>'id',
               'title', coalesce(n->>'title', 'Untitled page'),
               'tags', coalesce(n->>'tags', ''),
               'body', coalesce(n->>'body', ''),
               'shared', true,
               'sharedAt', n->>'sharedAt'
             )
             order by ord
           ),
           '[]'::jsonb
         )
    from campaigns c
    cross join lateral jsonb_array_elements(c.notes) with ordinality as t(n, ord)
   where c.id = p_campaign
     and c.id in (select public.campaigns_for_user())
     and n->'shared' = 'true'::jsonb
$$;

grant execute on function public.gm_campaign_notes(uuid) to authenticated;
grant execute on function public.shared_campaign_notes(uuid) to authenticated;
revoke execute on function public.gm_campaign_notes(uuid) from public, anon;
revoke execute on function public.shared_campaign_notes(uuid) from public, anon;
