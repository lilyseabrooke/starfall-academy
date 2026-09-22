# Changelog

All notable changes to Starfall Academy, by version. See `VERSIONING.md` for
what MAJOR/MINOR/PATCH mean here.

Versions below **v1.0.0** predate version tracking and aren't reconstructed
commit-by-commit; v1.0.0 onward is rebuilt from git + Vercel deployment
history, since the practice of bumping a version number didn't exist yet
when these shipped.

## v1.19.0 — 2026-09-22
- New Chronicle page at `/chronicle`: a horizontal timeline of every past
  campaign, read live from the Campaigns tab of the same workbook the
  Compendium pulls spells, artifacts and wands from. Campaigns are placed by
  semester as well as year (Fall 2011 sits half a year after Spring 2011), a
  campaign that ran across two semesters draws as a bar that long, and
  campaigns running at the same time stack above and below the rail instead of
  overlapping. Each card carries the campaign's name, term, location and a
  monogram per player; clicking one opens the full record — description,
  dates, location and the party — in the same modal treatment as a character
  on the Ledger.
- The Chronicle parses the sheet's single PLAYERS field into players,
  characters, and who played whom, so a player who ran two characters in one
  campaign is listed once carrying both, rather than twice.
- Two ways to narrow the timeline, and they stack: search, which covers
  campaign, player and character names, and the Locations panel bottom-left,
  which doubles as the legend for the accent colour on each card. A campaign's
  own record filters too — its location heading follows that place. If the two
  between them rule everything out, the timeline says so and offers to clear
  them.
- Fix: the crest watermark behind a character's record on the Family Ledger
  laid out inline instead of sitting in the background, so every character and
  family modal opened on a tall empty block and pushed the name out of sight.
  Its rule and the one setting every other child of the modal to
  `position: relative` have equal CSS specificity, so source order was handing
  the watermark the wrong one.

## v1.18.0 — 2026-09-21
- Fix: the artifact Repair popup rendered as unstyled, unusable overlapping
  text — its CSS was scoped to a container the popup no longer lived inside
  once it opened, since it's positioned via a portal to stay on-screen.
- The artifact edit panel now has a Condition field, so a GM/player can set
  an artifact to Stable/Damaged/Broken directly instead of only through a
  repair roll.

## v1.17.1 — 2026-09-21
- Fix: an Artifact bought directly with points in the Forge's custom build
  (rather than granted by a class) always got its move's Boon roll stat/skill
  hardcoded to Insight/none, ignoring the artifact's own skill(s). It now
  gets the same stat/skill (and multiple roll options, for a multi-skill
  artifact) the sheet already uses when an artifact is granted during play.

## v1.17.0 — 2026-09-21
- Fix: custom-build class ranks bought past the free base rank cost a flat
  2 points per level instead of scaling with the level bought (rank 5 now
  costs 10 points, rank 3 costs 6, etc).
- Custom build can now buy Items with points, the same way it already buys
  Wands and Artifacts, at the same 400-mat-per-point ratio — and unlike
  Wands/Artifacts, the same Item can be bought in any quantity.
- Fix: custom-build Wand/Artifact/Item purchases each rounded their own mat
  cost up to the next point individually, so several cheap purchases could
  cost far more than their combined mat value. The whole basket's mat total
  is now rounded up once instead.

## v1.16.1 — 2026-09-20
- The standalone Compendium's category tab bar now has small nudge
  buttons and eases a vertical scroll-wheel gesture into a smooth
  horizontal scroll while the bar is hovered, so every tab stays reachable
  on devices without horizontal scroll input.

## v1.16.0 — 2026-09-19
- The Vialbottom Board: added a new suspect token, The Blue-Eyed Man.
- The Vialbottom Board now supports multiple boards via tabs — start a
  fresh board without losing or resetting an existing one. Each tab is a
  fully independent board (its own tokens, strings, notes, and shapes),
  and boards can be added, renamed, switched between, and closed.

## v1.15.2 — 2026-09-17
- Fix: an artifact picked in the Forge during character creation (from a
  class grant or bought directly in the Inventory step) was attuned but its
  linked Boon move never showed up on the sheet. Picking an artifact there
  now adds its move alongside it, same as attuning one after character
  creation already did.

## v1.15.1 — 2026-09-17
- Removed the "Map Studio" dev-authoring tooling (the edit-mode tweak
  panels and their postMessage protocol) from the shipped campus map,
  character-sheet map, family ledger, and compendium — those were
  build-time tools for tuning layout, never meant to reach players.

## v1.15.0 — 2026-09-13
- `/api/stories` gains a `PATCH` endpoint: re-submitting a doc link that's
  already in the Stories catalogue under a different title or author now
  updates that existing row instead of leaving it untouched, so the Discord
  bot can fix a listing without creating a duplicate entry for the same doc.

## v1.14.1 — 2026-09-12
- The Vialbottom Board: notes and string labels now grow to fit whatever's
  typed into them instead of clipping it, and "Export" renders their full,
  wrapped text instead of squashing it onto one line.
- String anchors (the bend points you drop by clicking a string) are now
  individually removable — double-click one, select it and press
  Delete/Backspace, or use its × chip — without cutting the whole string.
- Strings can now start and end in empty space, not just on a suspect
  token: the String tool pins a free anchor point wherever you click, and
  clicking an existing anchor point continues a string from it, so
  multiple strings can meet at a shared joint off to the side of the board.

## v1.14.0 — 2026-09-12
- Add The Vialbottom Board, a hidden bonus dossier page at `/vialbottom` —
  deliberately unlinked from the nav, reachable by URL only. A drag-and-drop
  investigation corkboard: pin the twelve suspect tokens anywhere on the
  board, run red string between two of them (click a string to drop an
  anchor and bend its path), ring a group of suspects, point an arrow, or
  pin a note. Names can be toggled on as labels, the whole board resets to
  its starting layout, and "Export" saves it as a PNG. Layout persists to
  the browser's local storage. Built in the site's dark-academia palette and
  type, vendored as a standalone React app the same way `/character-map` and
  `/map` are — but without the top bar the rest of the site carries.

## v1.13.0 — 2026-09-10
- Add Stories, a catalogue of stories written by the Starfall community, each
  one a link out to the writer's own Google Doc. The page lives at `/stories`
  and is deliberately unlinked from the nav — it's reachable by URL only.
  Stories are submitted through the Discord bot, which posts them to a new
  `POST /api/stories` endpoint gated by a shared secret; the page itself is
  public and read-only, backed by a new `stories` table whose RLS grants
  read to everyone and writes to nobody but the service role.
- The catalogue is laid out as a shelf of cards in the house style: an
  illuminated capital tinted to its author, an accession number that stays
  put as the archive grows, the title, the author, the date it was filed,
  and a Read link out to the doc. Readers can search by title or author and
  sort by newest, oldest, title, or author.

## v1.12.0 — 2026-09-10
- Add a character sheet overview: a one-page summary card of a character —
  name, pronouns, title, House and year, major(s), every stat, subject and
  skill with points in it, each class rank with the abilities chosen along the
  way, and the names of every spell known and everything carried. It opens
  from a button on the Forge's Review step, and — for a character that's
  already built, where there is no Review step — from the bottom of the
  Identity page, in the slot Random Character occupies for a new one. Editing
  an existing character, the card reads classes, spells and gear off the live
  character rather than the respec draft. "Copy card" puts the whole thing on
  the clipboard as an image, ready to paste and share, and the card scales
  itself down to stay one page on a short window.

## v1.11.1 — 2026-09-10
- Fix Random Character forcing a multiclass build for two archetypes
  (Skill Specialist, Battle Skirmisher) instead of leaving them to the
  normal single/double coin flip — was pushing the overall multiclass
  rate to ~62% instead of the intended 50%.

## v1.11.0 — 2026-09-10
- Add a "View Character" button to campaign-less characters on the
  character dashboard, opening the same standalone sheet view shown when
  finishing character creation.

## v1.10.1 — 2026-09-08
- The Forge Inventory step's Artifacts section (class-granted artifacts)
  now always shows, alongside Potions/Plants/Glyphs/Wands, instead of
  disappearing when the character's class choices don't currently grant
  one.
- Support a combined `move(); item()` tag on a single class rank option,
  for options that both name a skill and grant an artifact outright.

## v1.10.0 — 2026-09-08
- Add a Random Character generator to the Forge: builds a full character
  (classes, stats, subjects, skills, wand, spells, and gear) for the Year
  and Build type chosen on the Identity page, in one of nine archetypes,
  then drops you at Review to tweak anything you like. Confirms before
  overwriting an already-started character's progress.

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
