-- The characters table was created without the standard Supabase data-access
-- grants (only REFERENCES/TRIGGER/TRUNCATE came from PUBLIC defaults), so every
-- PostgREST read/write hit "permission denied for table characters" before RLS
-- even ran — reads silently returned nothing and writes 400'd. RLS (already
-- enabled) scopes which rows a user sees; these grants allow the roles to touch
-- the table at all.
grant select, insert, update, delete on table public.characters to authenticated;
grant all on table public.characters to service_role;
