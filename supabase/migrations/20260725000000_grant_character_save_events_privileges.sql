-- character_save_events (20260718000001) was created with RLS + a policy
-- but no table-level grant — the same gap 20260624000001 already documented
-- and fixed for `characters`: without an explicit GRANT, PostgREST returns
-- "permission denied for table character_save_events" before RLS even runs.
-- The client's logging insert swallowed that into a console.error, so an
-- entire live session (67 rolls, 5 characters' sheets genuinely updated)
-- produced zero rows — not because nothing happened, but because every
-- logging attempt was silently rejected.
grant select, insert on table public.character_save_events to authenticated;
grant all on table public.character_save_events to service_role;
