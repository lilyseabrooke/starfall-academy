-- RECONCILIATION FILE — this statement was already applied to the remote
-- project (as "grant_character_save_events_privileges") and is not being
-- re-run; it's added here so the migration history in this repo matches
-- what actually happened on the database.
--
-- Same bug as 20260624000001_grant_characters_privileges.sql:
-- 20260718000001_character_save_events.sql created the table with RLS but
-- without the standard PostgREST data-access grants, so every insert/read
-- hit "permission denied for table character_save_events" until this was
-- applied live as a follow-up.
grant select, insert on table public.character_save_events to authenticated;
grant all on table public.character_save_events to service_role;
