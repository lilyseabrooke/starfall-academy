# Changelog

All notable changes to Starfall Academy, by version. See `VERSIONING.md` for
what MAJOR/MINOR/PATCH mean here.

Versions below **v1.0.0** predate version tracking and aren't reconstructed
commit-by-commit; v1.0.0 onward is rebuilt from git + Vercel deployment
history, since the practice of bumping a version number didn't exist yet
when these shipped.

## v1.9.3 — 2026-09-05
- Fix the Compendium drawer briefly showing baked-in seed spells (like
  "Kindle the Hearth-Ward") while the live data was still loading; it now
  shows a crest loading placeholder instead.

## v1.9.2 — 2026-09-05
- Fix the DC-tie improvement roll never surfacing — it opened anchored to
  the bottom-left corner of the screen instead of as a centered modal, and
  was silently discarded by the next click. (#76)

## v1.9.1 — 2026-09-03
- Fix long prose blocks stranding empty space next to short ones on Lore/Asset cards.

## v1.9.0 — 2026-09-03
- Add the Subcultures Lore page to the Compendium.

## v1.8.0 — 2026-09-02
- Add a full roll log archive to the roll dock, with search, filters, and
  infinite scroll through a campaign's entire roll history. (#75)

## v1.7.1 — 2026-09-02
- Fix the roll log backlog permanently sticking at the 200th-ever roll once
  a campaign passed that count. (#74)

## v1.7.0 — 2026-08-27
- Add the Archetypes Lore page, with a Class sort and a double-draw Random option.

## v1.6.0 — 2026-08-26
- Award a Rank Point on successful improvement rolls. (#73)

## v1.5.2 — 2026-08-23
- Fix higher-level spell behavior not showing on rolls shared with the party. (#72)

## v1.5.1 — 2026-08-20
- Keep the Filters button open-able on mobile for sort-only tabs (Classes, Events). (#71)

## v1.5.0 — 2026-08-20
- Add Assets/Lore views to the Compendium, plus an Events timing sort and badge. (#70)

## v1.4.0 — 2026-08-15
- Add a Random option to Compendium sort. (#69)

## v1.3.1 — 2026-08-14
- Fix Resist rolls not incrementing Conditions on failure. (#68)

## v1.3.0 — 2026-08-08
- Persist GM NPCs and campaign journal on the campaign row instead of resetting
  on every reload; reconcile Supabase migration drift. (#67)

## v1.2.2 — 2026-08-08
- Add a close (X) button to the roll modal. (#66)

## v1.2.1 — 2026-08-08
- Roll Log ledger cleanup and a higher-level-behavior placeholder fix. (#65)

## v1.2.0 — 2026-08-08
- Add the Volatile spell tag end-to-end (backfire rules, filters, Compendium display). (#64)

## v1.1.2 — 2026-08-08
- Extend the DC-tie improvement trigger to cover a critical override on the same roll. (#63)

## v1.1.1 — 2026-08-08
- Include the Artificy backfire save in the DC-tie improvement trigger. (#62)

## v1.1.0 — 2026-08-08
- Extend the DC-tie improvement-roll trigger to every trained skill/subject
  roll (moves, spells, enchanting, wandcraft, and more), not just plain checks. (#61)

## v1.0.1 — 2026-07-18
**Hotfix**, shipped hours after the first game. Confirmed via production
logs: two characters logged 9,241 and 4,700 requests in 7 days, ~99.9% HTTP
409, most in the final 24 hours — the game session itself.
- Stop the party roster and GM board from over-fetching full sheet JSON per member.
- Diff-patch character sheet autosave directly to Supabase instead of
  round-tripping the entire sheet through a Vercel API route.
- Fix a production livelock in the autosave conflict-retry path that had no
  in-flight guard or retry cap.
- Add autosave telemetry (`character_save_events`) so a future session like
  this one can be diagnosed with a query instead of hand-sampling logs.

## v1.0.0 — 2026-07-17
**The build that ran the first game.** Includes the DC-tie improvement-roll
trigger (#60) and everything merged before it. This is the version the
massive usage spike above hit.
