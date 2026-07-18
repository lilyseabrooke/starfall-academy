-- Diff-based sheet autosave: the client used to PATCH the *entire* serialized
-- sheet (every spell's full text, all inventory) through a Next.js API route
-- on every debounced edit, which round-trips through the Vercel origin
-- function twice (request in, response out) and is billed as Fast Origin
-- Transfer. This RPC accepts a partial sheet — only the top-level keys that
-- actually changed since the client's last known-good snapshot — and
-- shallow-merges it into the stored sheet with `||`. It's SECURITY INVOKER
-- (the default), so the UPDATE below runs as the calling user and is
-- authorized by the same RLS policies as a direct table write ("owners can
-- do everything" / "gm updates campaign pc sheets") — meaning it can be
-- called straight from the browser, never touching the Vercel origin at all.
--
-- p_expected_updated_at implements the same optimistic-concurrency check the
-- old PATCH route had: if the row moved on since the client last synced (a GM
-- grant, another tab's save), no row matches and this returns empty instead
-- of clobbering whatever the other writer just added.
create or replace function public.patch_character_sheet(
  p_character uuid,
  p_patch jsonb,
  p_expected_updated_at timestamptz default null
)
returns table (sheet jsonb, updated_at timestamptz)
language plpgsql
set search_path = public
as $$
begin
  return query
    update characters
      set sheet = coalesce(characters.sheet, '{}'::jsonb) || p_patch,
          name = coalesce(nullif(p_patch #>> '{c,name}', ''), characters.name)
      where characters.id = p_character
        and (p_expected_updated_at is null or characters.updated_at = p_expected_updated_at)
      returning characters.sheet, characters.updated_at;
end;
$$;

grant execute on function public.patch_character_sheet(uuid, jsonb, timestamptz) to authenticated;
revoke execute on function public.patch_character_sheet(uuid, jsonb, timestamptz) from public, anon;
